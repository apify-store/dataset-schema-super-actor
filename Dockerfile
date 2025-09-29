FROM apify/actor-node:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=prod

# Copy source code
COPY . ./

# Compile TypeScript
RUN npm run build

# Run the Actor
CMD ["npm", "start"]

