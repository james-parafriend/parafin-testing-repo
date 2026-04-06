const express = require("express");
const app = express();
const axios = require("axios");
const path = require("path");
require("dotenv").config();

// middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PARAFIN_BASE_URL = "https://api.parafin.com/v1";
const PARAFIN_DEV_BASE_URL = "https://api.dev.parafin.com/v1";

// load credential profiles from credentials.json
const credentialsConfig = require(path.join(__dirname, "../credentials.json"));

function getProfileConfig(profileName) {
  const profile = credentialsConfig.profiles.find(
    (p) => p.name === profileName,
  );
  if (!profile) throw new Error(`Unknown profile: "${profileName}"`);
  const clientId = process.env[profile.clientIdVar];
  const clientSecret = process.env[profile.clientSecretVar];
  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing env vars for profile "${profileName}": ${profile.clientIdVar}, ${profile.clientSecretVar}`,
    );
  }
  return {
    isDev: profile.env === "dev",
    auth: { username: clientId, password: clientSecret },
  };
}

// expose profile list to the frontend (names + env only, never credentials)
app.get("/parafin/profiles", (req, res) => {
  const profiles = credentialsConfig.profiles.map((p) => ({
    name: p.name,
    env: p.env,
  }));
  res.send({ profiles });
});

// route for fetching Parafin token
app.get("/parafin/token/:id", async (req, res) => {
  const personId = req.params.id;
  const profileName = req.query.profile;
  let profileConfig;
  try {
    profileConfig = getProfileConfig(profileName);
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }

  const { isDev, auth } = profileConfig;
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/auth/redeem_token`;
  // console.log(`fetching token - profile: ${profileName}, isDev: ${isDev}`);
  // console.log(`personId: ${personId}`);

  try {
    const result = await axios.post(url, { person_id: personId }, { auth });
    // console.log(`Redeem Token Response: ${JSON.stringify(result.data)}`);
    const parafinToken = result.data.bearer_token;
    res.send({ parafinToken });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(error.response?.status || 500).send({
      message: error.response?.data || error.message,
    });
  }
});

// helper: fetch all pages from a paginated Parafin list endpoint
async function fetchAllPages(baseUrl, auth) {
  let results = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = startingAfter ? { starting_after: startingAfter } : {};
    const response = await axios.get(baseUrl, { auth, params });
    const body = response.data;
    const page = body.results || [];
    results = results.concat(page);
    hasMore = body.has_more === true && page.length > 0;
    if (hasMore) startingAfter = page[page.length - 1].id;
  }

  return results;
}

// route for fetching a person-business relationship by ID
app.get("/parafin/person_business_relationships/:id", async (req, res) => {
  const { id } = req.params;
  const profileName = req.query.profile;
  let profileConfig;
  try {
    profileConfig = getProfileConfig(profileName);
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }

  const { isDev, auth } = profileConfig;
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/person_business_relationships/${id}`;
  try {
    const result = await axios.get(url, { auth });
    res.send(result.data);
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(error.response?.status || 500).send({
      message: error.response?.data || error.message,
    });
  }
});

// route for listing all businesses
app.get("/parafin/businesses", async (req, res) => {
  const profileName = req.query.profile;
  let profileConfig;
  try {
    profileConfig = getProfileConfig(profileName);
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }

  const { isDev, auth } = profileConfig;
  const baseUrl = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/businesses`;
  // console.log(`fetching businesses - profile: ${profileName}, isDev: ${isDev}`);
  try {
    const businesses = await fetchAllPages(baseUrl, auth);
    // console.log(`Fetched ${businesses.length} businesses`);
    res.send({ businesses });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(error.response?.status || 500).send({
      message: error.response?.data || error.message,
    });
  }
});

// route for listing all persons
app.get("/parafin/persons", async (req, res) => {
  const profileName = req.query.profile;
  let profileConfig;
  try {
    profileConfig = getProfileConfig(profileName);
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }

  const { isDev, auth } = profileConfig;
  const baseUrl = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/persons`;
  // console.log(`fetching persons - profile: ${profileName}, isDev: ${isDev}`);
  try {
    const persons = await fetchAllPages(baseUrl, auth);
    res.send({ persons });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(error.response?.status || 500).send({
      message: error.response?.data || error.message,
    });
  }
});

// Starting Server
app.listen(process.env.PORT || 8080, () => {
  console.log(`App listening on PORT: ${process.env.PORT || 8080}`);
});
