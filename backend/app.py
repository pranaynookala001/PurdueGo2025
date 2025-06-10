from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import PyPDF2
from io import BytesIO
import re
import logging
from werkzeug.exceptions import RequestEntityTooLarge

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

#when someone goes to http://localhost:3001/api/ping, flask sees that /api/ping matches a route, it runs the ping function directly below
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

        # Initialize empty schedule for each day
        schedule = {
            "Monday": [],
            "Tuesday": [],
            "Wednesday": [],
            "Thursday": [],
            "Friday": []
        }

        # Process each course and add it to the schedule
        for course in data['courses']:
            course_code = course['code']
            days = course['days']
            start_time = course['startTime']
            end_time = course['endTime']
            location = course['location']

            # Create the class info string
            class_info = f"{start_time}–{end_time} {course_code} at {location}"

            # Add the class to each of its scheduled days
            for day in days:
                schedule[day].append(class_info)

        # Sort classes by start time within each day
        for day in schedule:
            schedule[day].sort(key=lambda x: x.split('–')[0])

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