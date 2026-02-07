# Agent Tasks

## Project Setup
1. [x] Create a new project directory titled "client" containing a vue.js app with a simple home screen
2. [x] Create a new project directory titled "server" containing a nodejs express api in typescript

## Feature Development
3. [x] Create a new client UI feature named View Photos which presents a list of photos in directory structure.
4. [x] Create a new json object named "photos-data.json" under the /specs directory that is based on the View Photos data payload
5. [x] Create a new API route under the /server directory to read photos from a local directory and present back in the format that follows /specs/photos-data.json
6. [x] Update the View Photos UI screen to fetch the Photo data from the server endpoint GET http://localhost:5000/api/photos
7. [x] Create a new client UI feature that enables a photo backup sync process and monitors the progress
8. [x] Update the server backup function to upload a file to an AWS S3 bucket
9. [x] Add a sqlite database to keep track of the backup sync processes and file upload status
10. [x] Add UI functionality to view the backup history
11. [x] Update the backup service to provide the option to backup photos to a local directory backup or AWS S3
12. [x] Update the Home screen to remove the feature cards
13. [x] Add a feature to scan all photos in the source directory and persist the structure in the sqlite database. The directory and files should be retrieved from the database rather than the file system.