const express = require("express");
const app = express();
const axios = require("axios");
require("dotenv").config();

// middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PARAFIN_BASE_URL = "https://api.parafin.com/v1";
const PARAFIN_DEV_BASE_URL = "https://api.dev.parafin.com/v1";

// route for fetching Parafin token
app.get("/parafin/token/:id/:isDev?", async (req, res) => {
  const personId = req.params.id;
  const isDev = req.params.isDev;
  const url = `${
    isDev === "true" ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL
  }/auth/redeem_token`;
  // console.log(`isDev: ${isDev}, url: ${url}`);
  console.log(`personId: ${personId}`);

  const data = {
    person_id: personId,
    // person_external_id: "maria-santos",
    // read_only: true,
  };

  const config = {
    auth: {
      username: process.env.PARAFIN_CLIENT_ID,
      password: process.env.PARAFIN_CLIENT_SECRET,
    },
  };

  try {
    // make call to fetch Parafin token for business
    const result = await axios.post(url, data, config);
    const parafinToken = result.data.bearer_token;

    res.send({
      parafinToken: parafinToken,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(error.response?.status || 500).send({
      message: error.response?.data || error.message,
    });
  }
});

// helper: fetch all pages from a paginated Parafin list endpoint
async function fetchAllPages(baseUrl, config) {
  let results = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = startingAfter ? { starting_after: startingAfter } : {};
    const response = await axios.get(baseUrl, { ...config, params });
    const body = response.data;
    const page = body.results || [];
    results = results.concat(page);
    hasMore = body.has_more === true && page.length > 0;
    if (hasMore) {
      startingAfter = page[page.length - 1].id;
    }
  }

  return results;
}

const AUTH_CONFIG = {
  auth: {
    username: process.env.PARAFIN_CLIENT_ID,
    password: process.env.PARAFIN_CLIENT_SECRET,
  },
};

// route for fetching a person-business relationship by ID
app.get("/parafin/person_business_relationships/:id", async (req, res) => {
  const { id } = req.params;
  const isDev = req.query.isDev === "true";
  const url = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/person_business_relationships/${id}`;
  // console.log(`Fetching relationship: ${id}`);
  try {
    const result = await axios.get(url, AUTH_CONFIG);
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
  const isDev = req.query.isDev === "true";
  const baseUrl = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/businesses`;
  console.log(`isDev: ${isDev}, baseUrl: ${baseUrl}`);
  try {
    const businesses = await fetchAllPages(baseUrl, AUTH_CONFIG);
    console.log(`Fetched ${businesses.length} businesses`);
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
  const isDev = req.query.isDev === "true";
  const baseUrl = `${isDev ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL}/persons`;
  console.log(`isDev: ${isDev}, baseUrl: ${baseUrl}`);
  try {
    const persons = await fetchAllPages(baseUrl, AUTH_CONFIG);
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
