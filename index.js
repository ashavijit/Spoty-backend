require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
let REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:5000/callback";
let FRONTEND_URI = process.env.FRONTEND_URI || "http://localhost:3000";
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  REDIRECT_URI = "http://localhost:5000/callback";
  FRONTEND_URI = "http://localhost:3000";
}

const express = require("express");
const path = require("path");
const querystring = require("querystring");
const request = require("request");
const bodyParser = require("body-parser");
const app = express();

function generateRandomString(length) {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const state = generateRandomString(16);

app.use(express.static(path.resolve(__dirname, "../client/build")));
app.set("views", path.resolve(__dirname, "../client/public/views"));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.render(path.resolve(__dirname, "../client/build/index.html"));
});

app.get("/login", (req, res) => {
  const scope =
    "user-read-private user-read-email user-read-recently-played user-top-read user-follow-read user-follow-modify playlist-read-private playlist-read-collaborative playlist-modify-public user-library-read user-read-currently-playing user-modify-playback-state user-library-modify";

  res.redirect(
    `https://accounts.spotify.com/authorize?${querystring.stringify({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      state: state,
      scope: scope,
    })}`
  );
});

app.get("/callback", (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  if (state === null)
    res.redirect(`/#${querystring.stringify({ error: "state_mismatch" })}`);
  else {
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization: `Basic ${new Buffer.from(
          `${CLIENT_ID}:${CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token;
        const refresh_token = body.refresh_token;
        res.redirect(
          `${FRONTEND_URI}/#${querystring.stringify({
            access_token,
            refresh_token,
          })}`
        );
      } else {
        res.redirect(`/#${querystring.stringify({ error: "invalid_token" })}`);
      }
    });
  }
});

// app.get("/refresh_token", (req, res) => {
//   const refresh_token = req.refresh_token;
//   const authOptions = {
//     url: "https://accounts.spotify.com/api/token",
//     form: {
//       grant_type: "refresh_token",
//       refresh_token: refresh_token,
//     },
//     headers: {
//       Authorization: `Basic ${new Buffer.from(
//         `${CLIENT_ID}:${CLIENT_SECRET}`
//       ).toString("base64")}`,
//     },
//     json: true,
//   };

//   request.post(authOptions, (error, response, body) => {
//     if (!error && response.statusCode === 200) {
//       const access_token = body.access_token;
//       res.send({ access_token });
//     }
//   });
// });

app.get("*", function (request, response) {
  response.sendFile(path.resolve(__dirname, "../client/public", "index.html"));
});

app.listen(PORT, function () {
  console.warn(`Node cluster worker ${process.pid}: listening on port ${PORT}`);
});
