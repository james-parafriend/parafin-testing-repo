const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const app = express();
const axios = require("axios");
require("dotenv").config();

// middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// session
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

const PARAFIN_BASE_URL = "https://api.parafin.com/v1";
const PARAFIN_DEV_BASE_URL = "https://api.dev.parafin.com/v1";

// route for fetching Parafin token
app.get("/parafin/token/:id/:isDev?", async (req, res) => {
  const personId = req.params.id;
  const isDev = req.params.isDev;
  const url = `${
    isDev === "true" ? PARAFIN_DEV_BASE_URL : PARAFIN_BASE_URL
  }/auth/redeem_token`;
  console.log(personId);

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
    console.log(error.response.data);
    res.send({
      errorCode: error.response.status,
      message: error.response.data,
    });
  }
});

// Starting Server
app.listen(process.env.PORT || 8080, () => {
  console.log(`App listening on PORT: ${process.env.PORT || 8080}`);
});
