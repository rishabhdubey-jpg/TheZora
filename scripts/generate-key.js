const fs = require('fs');
require('dotenv').config();

const credentials = {
  type: "service_account",
  project_id: process.env.GCP_PROJECT_ID,
  private_key_id: "manual-key",
  private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GCP_CLIENT_EMAIL,
  client_id: "",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_CLIENT_EMAIL)}`
};

fs.writeFileSync('gcp-key.json', JSON.stringify(credentials, null, 2));
console.log('gcp-key.json created successfully');
