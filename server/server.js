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

function resolveProfileOrError(req, res) {
  const profileName = req.query.profile;
  try {
    return getProfileConfig(profileName);
  } catch (err) {
    res.status(400).send({ message: err.message });
    return null;
  }
}

function handleError(res, error) {
  console.log(error.response?.data || error.message);
  res.status(error.response?.status || 500).send({
    message: error.response?.data || error.message,
  });
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
  const profileConfig = resolveProfileOrError(req, res);
  if (!profileConfig) return;

  const personId = req.params.id;
  const { isDev, auth } = profileConfig;
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/auth/redeem_token`;

  try {
    const result = await axios.post(url, { person_id: personId }, { auth });
    res.send({ parafinToken: result.data.bearer_token });
  } catch (error) {
    handleError(res, error);
  }
});

// route for fetching a person-business relationship by ID
app.get("/parafin/person_business_relationships/:id", async (req, res) => {
  const profileConfig = resolveProfileOrError(req, res);
  if (!profileConfig) return;

  const { id } = req.params;
  const { isDev, auth } = profileConfig;
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/person_business_relationships/${id}`;

  try {
    const result = await axios.get(url, { auth });
    res.send(result.data);
  } catch (error) {
    handleError(res, error);
  }
});

// route for listing businesses (paginated)
app.get("/parafin/businesses", async (req, res) => {
  const profileConfig = resolveProfileOrError(req, res);
  if (!profileConfig) return;

  const { isDev, auth } = profileConfig;
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const startingAfter = req.query.starting_after || undefined;

  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/businesses`;
  const params = { limit, ...(startingAfter && { starting_after: startingAfter }) };

  try {
    const response = await axios.get(url, { auth, params });
    const body = response.data;
    const businesses = body.results || [];
    const hasMore = body.has_more === true;
    const nextCursor = hasMore && businesses.length > 0
      ? businesses[businesses.length - 1].id
      : null;
    res.send({ businesses, has_more: hasMore, next_cursor: nextCursor });
  } catch (error) {
    handleError(res, error);
  }
});

// route for fetching a single business by ID
app.get("/parafin/businesses/:id", async (req, res) => {
  const profileConfig = resolveProfileOrError(req, res);
  if (!profileConfig) return;

  const { id } = req.params;
  const { isDev, auth } = profileConfig;
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/businesses/${id}`;

  try {
    const result = await axios.get(url, { auth });
    res.send(result.data);
  } catch (error) {
    handleError(res, error);
  }
});

// route for listing persons (paginated)
app.get("/parafin/persons", async (req, res) => {
  const profileConfig = resolveProfileOrError(req, res);
  if (!profileConfig) return;

  const { isDev, auth } = profileConfig;
  const limit = Math.min(parseInt(req.query.limit) || 25, 100);
  const startingAfter = req.query.starting_after || undefined;

  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/persons`;
  const params = { limit, ...(startingAfter && { starting_after: startingAfter }) };

  try {
    const response = await axios.get(url, { auth, params });
    const body = response.data;
    const persons = body.results || [];
    const hasMore = body.has_more === true;
    const nextCursor = hasMore && persons.length > 0
      ? persons[persons.length - 1].id
      : null;
    res.send({ persons, has_more: hasMore, next_cursor: nextCursor });
  } catch (error) {
    handleError(res, error);
  }
});

// route for fetching a single person by ID
app.get("/parafin/persons/:id", async (req, res) => {
  const profileConfig = resolveProfileOrError(req, res);
  if (!profileConfig) return;

  const { id } = req.params;
  const { isDev, auth } = profileConfig;
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/persons/${id}`;

  try {
    const result = await axios.get(url, { auth });
    res.send(result.data);
  } catch (error) {
    handleError(res, error);
  }
});

// Starting Server
app.listen(process.env.PORT || 8080, () => {
  console.log(`App listening on PORT: ${process.env.PORT || 8080}`);
});
