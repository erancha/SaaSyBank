# Use the official Node.js image
FROM node:20

# Set the working directory
WORKDIR /usr/src/app

# Copy only package.json and package-lock.json first
COPY package*.json ./

# Install dependencies (this layer will be cached if package files do not change)
RUN npm install

# Now copy the application code
COPY . .

# Expose the port
EXPOSE 3000

# Command to run the application
CMD [ "node", "index.js" ]
