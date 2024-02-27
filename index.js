const https = require('https');
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const bodyParser = require('body-parser');

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('example.db');

db.run("CREATE TABLE IF NOT EXISTS schedule (id INTEGER PRIMARY KEY, date TEXT, data TEXT)");

let insertQuery = "INSERT INTO schedule (date, data) VALUES (?, ?)";
let selectQuery = "SELECT * FROM schedule WHERE date = ?";
let deleteQuery = "DELETE FROM schedule WHERE date = ?"
let selectAll = "SELECT * FROM schedule";

const app = express();
const PORT = 5000;

const options = {
  cert: fs.readFileSync('/etc/letsencrypt/live/s7b0t4-website-server.ru/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/s7b0t4-website-server.ru/privkey.pem')
};

const server = https.createServer(options, app);

const cors = require("cors")

const corsOrigin = {
  origin: ["https://s7b0t4-schedule.netlify.app", "http://localhost:3000"],
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOrigin));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  db.all(selectAll, (err, rows) => {
    if (err) {
      throw err;
    }
    res.send(rows)
  });
})

app.post('/rewrite', async (req, res) => {
  console.log("try update")
  res.set("Access-Control-Allow-Origin", "*");
  req = req.body
  const getSchedule = async (day, month, year) => {

    db.run(deleteQuery, [`${day}.${month}.${year}`], (() => {
      console.log("delete last change")
    }))

    console.log(`try to find ${day}.${month}.${year}`)
    let response = await axios.get(`https://nouoet.ru/Users/schedule/22-2-2024.htm`, { responseType: 'arraybuffer' });
    try {
      response = await axios.get(`https://nouoet.ru/Users/schedule/${day}-${month}-${year}.htm`, { responseType: 'arraybuffer' });
    } catch (error) {
      if (error.response) {
        db.run(insertQuery, [`${day}.${month}.${year}`, '["Нету! :P :З"]'], ((err) => {
          if (err) {
            return console.log("err" + err)
          }
          console.log("add new")
          res.send(["Нету! :P :З"])
        }))
        return
      } else if (error.request) {
        res.send({ "description": `Извините что-то с сервером` })
        console.error(`Извините что-то с сервером`);
      } else {
        console.error('Ошибка:', error.message);
      }
    }

    const html = iconv.decode(response.data, 'win1251');

    const $ = cheerio.load(html);

    const rows = $('tr').toArray();

    let scheduleData = rows.map(row => {
      const cells = $(row).find('td').toArray();
      const rowData = cells.map(cell => $(cell).text().trim());
      return rowData;
    });

    const combineValues = (arrayOfArrays, min, max) => {
      const arr = [[], [], [], [], [], [], [], [], []]

      arrayOfArrays.forEach((element, index) => {
        if (index >= min && index <= max) {
          element.forEach((value, ind) => {
            if (index !== 1) {
              arr[ind] += " " + value
            }
          });
        }
      });
      arrayOfArrays[min] = arr
      arrayOfArrays.splice(min + 1, max - min)
    }

    function removeEmptyArrays(arr) {
      return arr.filter(subArray => !subArray.every(value => value === ''));
    }

    scheduleData = removeEmptyArrays(scheduleData)

    scheduleData = scheduleData.filter(item => Array.isArray(item));

    scheduleData.forEach(element => {
      element.shift()
    });
    scheduleData.pop()

    const addValueAtIndex = (array, index, value) => {
      if (Array.isArray(array)) {
        if (index >= 0 && index <= array.length) {
          array.splice(index, 0, value);
          return array;
        } else {
          console.error("Индекс находится за пределами массива.");
          return array;
        }
      }
    }

    if (scheduleData[1][0] === "ВРЕМЯ") {
      for (let i = 2; i < scheduleData.length - 2; i++) {
        if (scheduleData[i].length === scheduleData[i + 1].length && scheduleData[i].length === scheduleData[i + 2].length) {
          addValueAtIndex(scheduleData[1], 2, scheduleData[1][1])
          for (let i = 0; i < scheduleData.length - 2; i++) {
            if (scheduleData[i].length === scheduleData[i + 1].length + 1 && scheduleData[i].length === scheduleData[i + 2].length + 1) {
              addValueAtIndex(scheduleData[i], 1, "")
              addValueAtIndex(scheduleData[i + 1], 1, "")
              addValueAtIndex(scheduleData[i + 1], 1, "")
              addValueAtIndex(scheduleData[i + 2], 1, "")
              addValueAtIndex(scheduleData[i + 2], 1, scheduleData[i][2])
            }
          }
          break
        }
      }
      if (scheduleData[2].length === scheduleData[3].length + 1 && scheduleData[2].length === scheduleData[4].length + 1) {
        addValueAtIndex(scheduleData[3], 1, "")
        addValueAtIndex(scheduleData[4], 1, "")
        addValueAtIndex(scheduleData[7], 1, "")
        addValueAtIndex(scheduleData[8], 1, "")
        addValueAtIndex(scheduleData[11], 1, "")
        addValueAtIndex(scheduleData[12], 1, "")
        addValueAtIndex(scheduleData[15], 1, "")
        addValueAtIndex(scheduleData[16], 1, "")
        if (scheduleData.length > 20) {
          addValueAtIndex(scheduleData[19], 1, "")
          addValueAtIndex(scheduleData[20], 1, "")
        }
        if (scheduleData.length > 21) {
          addValueAtIndex(scheduleData[21], 1, "")
        }
      }
    }

    combineValues(scheduleData, 2, 4)
    combineValues(scheduleData, 4, 6)
    combineValues(scheduleData, 6, 8)
    combineValues(scheduleData, 8, 10)
    combineValues(scheduleData, 10, 12)

    for (let i = 2; i < scheduleData.length; i++) {
      if (Array.isArray(scheduleData[i])) {
        if (typeof scheduleData[i][0] === 'string') {
          scheduleData[i][0] = scheduleData[i][0].split("-")
          scheduleData[i][0][0] = scheduleData[i][0][0].replace(/\./g, ":").trim()
          scheduleData[i][0][1] = scheduleData[i][0][1].replace(/\./g, ":").trim()
        }
        scheduleData[i].forEach((element, index) => {
          if (typeof element === 'string') {
            scheduleData[i][index] = element.replace(/\s+/g, ' ')
          }
        })
      }
    } day, month, year

    db.run(insertQuery, [`${day}.${month}.${year}`, JSON.stringify(scheduleData)], ((err) => {
      if (err) {
        return console.log(err)
      }
      console.log("update")
      res.send(scheduleData)
    }))
  }
  getSchedule(req.day, req.month, req.year)
})

app.post('/post', async (req, res) => {
  console.log("try to find in bd")
  res.set("Access-Control-Allow-Origin", "*");
  req = req.body
  db.all(selectQuery, [`${req.day}.${req.month}.${req.year}`], (err, rows) => {
      if(err){
        res.send(["empty"])
      }
      if (rows.length >= 1) {
        res.send(JSON.parse(rows[0].data))
      }
    });
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});