from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import PyPDF2
from io import BytesIO
import re
import logging
from werkzeug.exceptions import RequestEntityTooLarge
import googlemaps
from datetime import datetime, timedelta
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Google Maps client
# WARNING: Hardcoding API key directly in code is NOT recommended for production environments.
# This is done for immediate testing/development convenience.
# For production, use environment variables (e.g., os.environ.get('GOOGLE_MAPS_API_KEY'))
GOOGLE_MAPS_API_KEY = "AIzaSyA5blZoZ1RLVNeDYk-8qKATJQyn-XQ0y-g"
# GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')
# if not GOOGLE_MAPS_API_KEY:
#     logger.error("GOOGLE_MAPS_API_KEY environment variable not set.")
#     pass
gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

#creating an instance/object of the flask class and it becomes the web server, router, request/error handler, and response manager
app = Flask(__name__)
# Configure CORS to allow requests from any origin during development
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Increase maximum content length to 16MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

def get_travel_time(origin_coords, destination_coords, departure_time_unix):
    try:
        origin = f"{origin_coords['latitude']},{origin_coords['longitude']}"
        destination = f"{destination_coords['latitude']},{destination_coords['longitude']}"

        directions_result = gmaps.directions(
            origin, 
            destination, 
            mode="driving",
            departure_time=departure_time_unix,
            traffic_model="best_guess",
        )

        if directions_result and len(directions_result) > 0:
            route = directions_result[0]
            if 'legs' in route and len(route['legs']) > 0:
                leg = route['legs'][0]
                if 'duration_in_traffic' in leg:
                    return leg['duration_in_traffic']['value']
                elif 'duration' in leg:
                    return leg['duration']['value']
        return None
    except Exception as e:
        logger.error(f"Error fetching travel time: {str(e)}")
        return None

@app.route('/api/ping')
def ping():
    logger.info("Received ping request")
    #returns this json message as a python dictionary
    return jsonify({"message": "PurdueGo backend running!"})

@app.route('/api/generateSchedule', methods=['POST'])
def generateSchedule():
    try:
        data = request.get_json()
        if not data or 'courses' not in data:
            logger.error("Invalid request data received")
            return jsonify({"error": "Invalid request data"}), 400

        logger.info(f"Received schedule input: {data}")

        dorm_coords = data.get('dormCoords')

        schedule = {
            "Monday": [],
            "Tuesday": [],
            "Wednesday": [],
            "Thursday": [],
            "Friday": []
        }

        purdue_timezone = pytz.timezone('America/New_York')

        for course in data['courses']:
            course_code = course['code']
            days = course['days']
            start_time_str = course['startTime']
            end_time_str = course['endTime']
            location = course['location']
            class_location_coords = course.get('locationCoords')

            class_info = f"{start_time_str}–{end_time_str} {course_code} at {location}"

            for day in days:
                schedule[day].append({
                    "type": "class",
                    "info": class_info,
                    "startTime": start_time_str,
                    "endTime": end_time_str,
                })

                if dorm_coords and class_location_coords:
                    try:
                        # Parse class start time string into a datetime object for comparison
                        current_year = datetime.now().year # Use current year for accurate date comparison
                        # Use 2-digit hour format for strptime to handle 12 AM/PM correctly
                        class_start_dt = purdue_timezone.localize(datetime.strptime(f"{current_year} {start_time_str}", '%Y %I:%M %p'))

                        current_time_for_api = datetime.now(purdue_timezone)
                        
                        # Only calculate leave time if the class's start time is in the future
                        if class_start_dt > current_time_for_api:
                            BUFFER_SECONDS = 5 * 60

                            # Pass current time as Unix timestamp for departure_time
                            travel_time_seconds = get_travel_time(dorm_coords, class_location_coords, int(current_time_for_api.timestamp()))

                            if travel_time_seconds is not None:
                                leave_time_dt = class_start_dt - timedelta(seconds=travel_time_seconds + BUFFER_SECONDS)
                                
                                if leave_time_dt > current_time_for_api:
                                    leave_time_str = leave_time_dt.strftime('%I:%M %p').lstrip('0')
                                    schedule[day].append({
                                        "type": "leave_time",
                                        "info": f"Leave for {course_code} at {leave_time_str}",
                                        "startTime": leave_time_str,
                                        "endTime": start_time_str,
                                        "color": "#FFA500",
                                    })
                                else:
                                    logger.warning(f"Calculated leave time for {course_code} is in the past; skipping block.")
                            else:
                                logger.warning(f"Could not calculate travel time for {course_code}")
                        else:
                            logger.info(f"Class {course_code} at {start_time_str} is in the past; skipping leave time calculation.")
                    except Exception as e:
                        logger.error(f"Error calculating leave time for {course_code}: {str(e)}")

        for day in schedule:
            schedule[day].sort(key=lambda x: datetime.strptime(x['startTime'].replace('PM', ' PM').replace('AM', ' AM'), '%I:%M %p'))

        return jsonify({"schedule": schedule})
    except Exception as e:
        logger.error(f"Error generating schedule: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/uploadSchedule', methods=['POST'])
def uploadSchedule():
    try:
        if 'file' not in request.files:
            logger.error("No file uploaded")
            return jsonify({"error": "No file uploaded"}), 400
        
        pdf_file = request.files['file']
        if not pdf_file.filename.endswith('.pdf'):
            logger.error(f"Invalid file type: {pdf_file.filename}")
            return jsonify({"error": "Only PDF files are supported"}), 400

        logger.info(f"Processing PDF file: {pdf_file.filename}")
        
        try:
            reader = PyPDF2.PdfReader(BytesIO(pdf_file.read()))
            rawText = ''
            for page in reader.pages:
                rawText += page.extract_text() +"\n"
            
            course_list = extract_course_codes_from_pdf_text(rawText)
            
            if not course_list:
                logger.warning("No course codes found in PDF")
                return jsonify({"error": "No course codes found in the PDF"}), 400

            logger.info(f"Successfully extracted {len(course_list)} courses")
            return jsonify({"courses": course_list})
            
        except PyPDF2.PdfReadError as e:
            logger.error(f"PDF reading error: {str(e)}")
            return jsonify({"error": "Invalid or corrupted PDF file"}), 400
            
    except RequestEntityTooLarge:
        logger.error("File too large")
        return jsonify({"error": "File size exceeds maximum limit of 16MB"}), 413
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        return jsonify({"error": "Failed to process PDF file"}), 500

def extract_course_codes_from_pdf_text(text):
    lines = text.split('\n')
    course_codes = []

    # Look for lines that contain "Priority <SUBJ> <NUMBER>"
    pattern = re.compile(r'Priority\s+([A-Z]{2,4})\s+(\d{5})')

    for line in lines:
        match = pattern.search(line)
        if match:
            subject = match.group(1)
            number = match.group(2)
            course_codes.append(f"{subject} {number}")

    return course_codes

#checks if the script is being run directly or imported and then app.run, runs the app at port 3001
#debug = True, means that when there is a change the server auto-changes
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    logger.info(f"Starting server on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)  # Added host='0.0.0.0'