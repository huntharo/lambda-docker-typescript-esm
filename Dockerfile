ARG arch=amd64
ARG archImage=x86_64

#
# Create the app image
#
FROM --platform=linux/${arch} public.ecr.aws/lambda/nodejs:14-${archImage} AS base

# https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-Getting-Started-docker.html
# RUN curl -O https://lambda-insights-extension.s3-ap-northeast-1.amazonaws.com/amazon_linux/lambda-insights-extension.rpm && \
#     rpm -U lambda-insights-extension.rpm && \
#     rm -f lambda-insights-extension.rpm

# Copy in our built entry point
COPY ./dist-lib/index.* ./

# Move to .mjs so it's treated as as module even though package.json will
# have type=commonjs
RUN mv ./index.js ./index.mjs

# Use the package.json with type='commonjs' to make
# the default type be commonjs for all the app files that are loaded
COPY ./packages/cjs-app/package.json ./
COPY ./packages/cjs-app/dist/server.js* ./

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "index.handler" ]  
