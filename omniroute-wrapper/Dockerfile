# Render wrapper for the official OmniRoute image.
# The published image currently carries an inconsistent /tmp entrypoint;
# Render exits before the application can start. Clearing the inherited
# entrypoint lets the official standalone server start directly.
FROM diegosouzapw/omniroute:latest

# Render routes traffic to the port exposed by its PORT variable. OmniRoute
# also has separate dashboard/API defaults, so pin both to Render's web port.
ENV HOSTNAME=0.0.0.0
ENV PORT=10000
ENV DASHBOARD_PORT=10000
ENV API_PORT=10000

ENTRYPOINT []
USER node
CMD ["node", "dev/run-standalone.mjs"]
