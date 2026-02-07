# Agent Tasks

## Project Setup
1. [x] Create a new project directory titled "client" containing a vue.js app with a simple home screen
2. [x] Create a new project directory titled "server" containing a nodejs express api in typescript

## Feature Development
1. [x] Create a new client UI feature named View Photos which presents a list of photos in directory structure.
2. [x] Create a new json object named "photos-data.json" under the /specs directory that is based on the View Photos data payload
3. [x] Create a new API route under the /server directory to read photos from a local directory and present back in the format that follows /specs/photos-data.json
4. [x] Update the View Photos UI screen to fetch the Photo data from the server endpoint GET http://localhost:5000/api/photos
5. [x] Create a new client UI feature that enables a photo backup sync process and monitors the progress