const anilist = require('anilist-node');
const axios = require('axios');
const express = require('express');
const app = express();
const { google } = require('googleapis');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const path = require('path');
const { exit } = require('process');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'))

app.get("/", async (req, res) => {  

  //Anilist
  var latestAnime = [];  
  latestAnime = await getLatestAnime().catch(err => { console.log(err); });
  console.log(latestAnime);

  //Steam
  var gameHistory = [];
  gameHistory = await getGameHistory().catch(err => { console.log(err); });
  
  //Remove "Borderless Gaming" and "Wallpaper Engine" from the list
  for( var i = 0; i < gameHistory.length; i++){          
    if ( gameHistory[i]['appid'] == 388080 || gameHistory[i]['appid'] == 431960 ) { 
        gameHistory.splice(i, 1); 
        i--; 
    }
  }
  console.log(gameHistory);

  res.render('index', { latestAnime, gameHistory });
  
});

app.listen(3000, function() {
  console.log('App listening on port 3000');
});

//Anilist
const getLatestAnime = async () => {
  var latestAnime = [];
  const Anilist = new anilist();
  await Anilist.user.getRecentActivity(5655956).then(activities => {
    
    //Remove all activities that are not "watched episode"
    for( var i = 0; i < activities.length; i++){          
      if ( activities[i]['status'] != 'watched episode' ) { 
          activities.splice(i, 1); 
          i--; 
      }
    }
    console.log(activities);

    for(var i = 0; i < 1; i++ ) {
      Anilist.media.anime(activities[i].media.id).then(anime => {
        if (anime != undefined) {
          if (anime.coverImage != undefined && activities[i].status == 'watched episode'){
            var item = [];
            item['image'] = anime.coverImage.large;
            item['title'] = anime.title.english;
            item['activity'] = activities[i].status;
            item['progress'] = activities[i].progress;
            latestAnime.push(item);
          }
        }
      }).catch(err => { console.log(err); });
    }
  }).catch(err => { console.log(err); });
  return latestAnime;
}

//Steam
const getGameHistory = async () => {
  const steamId = process.env.steamId;
  const steamKey = process.env.steamKey; 
  const endpoint = `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${steamKey}&steamid=${steamId}`;

  const response = await axios.get(endpoint);
  return response.data.response.games;
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/google', async (req, res)  => {
  
  const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.googleClientId,
    clientSecret: process.env.googleClientSecret,
    redirectUri: "http://localhost:3000/google"
  });
  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly'
  ];

  tokens = fs.readFileSync('tokens.json', 'utf8');
  if (process.env.googleCode == '') {
    process.env.googleCode = req.query['code'];
  }

  if ( process.env.googleCode == '' ) {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
    res.redirect(url);
  } else if ( tokens == '' ) {
    const {tokens} = await oauth2Client.getToken(process.env.googleCode).catch(err => { console.log(err); });
    console.log(tokens);
    fs.writeFileSync('tokens.json', tokens, 'utf8');
  } else if ( tokens != '' ) {
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });
    const requestParams = {
      part: 'snippet,contentDetails',
      maxResults: 25,
      mine: true,    
      type: 'video'
    };
    const response = youtube.activities.list(requestParams);
    console.log(response.data);
  }
});