# Playwright official image (includes Chromium + all Linux deps)
FROM mcr.microsoft.com/playwright:v1.58.2-jammy

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy rest of the code
COPY . .

# Start the bot
CMD ["npm", "start"]
