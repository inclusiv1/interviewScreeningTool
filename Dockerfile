# Use Node.js LTS as the base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React frontend
RUN npm run build

# Expose ports for both frontend and backend
# Frontend: 3000, Backend: 3001
EXPOSE 3000 3001

# Allow connections from outside the container
ENV HOST=0.0.0.0

# Start the application using concurrently as defined in package.json
CMD ["npm", "start"]
