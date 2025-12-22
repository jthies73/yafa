# Use latest official Node.js runtime as the base image
FROM node:20-alpine as builder
# Set the working directory in the container
WORKDIR /app
# Copy build outputs into the container
COPY ./dist ./dist

# Use the official Nginx image as the base image
FROM nginx:1.19.6-alpine
# Copy the custom Nginx configuration file to the container
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy the built React app to the Nginx document root
COPY --from=builder /app/dist /usr/share/nginx/html
# Create an empty file for the Nginx PID and set the ownership of relevant directories
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
# Set the user to run the container as
USER nginx
# Expose port 80 to the outside world
EXPOSE 80
# Start Nginx and run it in the foreground
CMD ["nginx", "-g", "daemon off;"]