# Render wrapper for the official OmniRoute image.
# The published image currently carries an inconsistent /tmp entrypoint;
# Render exits before the application can start. Clearing the inherited
# entrypoint lets the official standalone server start directly.
FROM diegosouzapw/omniroute:latest

ENTRYPOINT []
USER node
CMD ["node", "dev/run-standalone.mjs"]
