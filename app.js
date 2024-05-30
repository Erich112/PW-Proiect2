const express = require("express");
const session = require('express-session');
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const fs = require('fs');
var mysql = require('mysql');
const { isUtf8 } = require("buffer");
var con = mysql.createConnection({
  host: "localhost",
  user: "eu",
  password: "eu"
});
var cos = [];
let authenticated = false;
let attempts = 0;
con.connect(function (err) {
  if (err) throw err;
  console.log("Connected to MySQL!");
});
con.query("USE `cumparaturi`;", function (err, result) {
  if (err) throw err;
  console.log("Conectat la baza de date");
});
const app = express();
app.use(cookieParser());
app.use(session({
  secret: 'secret story of the swan',
  cookie: {
    maxAge: 600000 // 10 minutes in milliseconds
  }
}));
let users = [];
fs.readFile("utilizatori.json", "Utf8", (err, data) => {
  if (err) {
    console.log("eroare la citire json users");
  }
  else {
    users = JSON.parse(data);
    console.log("am citit useri");
  }
});

let existaTabel = false;
const port = 6789;
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set("view engine", "ejs");
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static("public"));
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res

app.get("/", (req, res) => {
  console.log("sesiunea curenta are:", req.session)
  return new Promise((resolve, reject) => {
    con.query("SELECT * FROM `produse`;", function (err, result) {
      if (err) {
        reject(err); // Reject the promise on error
      } else {
        resolve({ user: req.session.user, shop: result }); // Resolve with data
      }
    });
  })
    .then(data => { // Handle resolved data
      res.render("index", data);
    })
    .catch(err => { // Handle rejected promise (error)
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});


app.get("/vizualizare-cos", (req, res) => {
  if (cos != [] || cos != null) {
    const listaProduse = [];
    const queryPromises = [];

    for (let i = 0; i < cos.length; i++) {
      queryPromises.push(new Promise((resolve, reject) => {
        con.query("SELECT Nume FROM `produse` WHERE (ID = " + cos[i] + ");", function (err, result) {
          if (err) {
            reject(err); // Reject the promise on error
          } else {
            if (result && result.length > 0) { // Check for existence and non-empty result
              resolve(result);
            } else {
              resolve(null); // Resolve with null if no product found
            }
          }
        });
      }));
    }

    // Use Promise.all to wait for all queries to finish
    Promise.all(queryPromises)
      .then(productNames => {
        listaProduse.push(...productNames); // Spread product names into listaProduse
        console.log(listaProduse)
        res.render("vizualizare-cos", { listaProduse });
      })
      .catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
      });
  }
});


app.get("/admin", (req, res) => {
  return new Promise((resolve, reject) => {
    con.query("SELECT * FROM `produse`;", function (err, result) {
      if (err) {
        reject(err); // Reject the promise on error
      } else {
        resolve({ username: req.session.user, role: req.session.rol, shop: result }); // Resolve with data
      }
    });
  })
    .then(data => { // Handle resolved data
      res.render("admin", data);
    })
    .catch(err => { // Handle rejected promise (error)
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});
app.post("/admin", (req, res) => {
  console.log()

  if ((req.body['newprodusname'] != "" || req.body['newprodusname'] != undefined) && (req.body['newprodusqty'] != "" || req.body['newprodusqty'] != undefined)) {
    con.query("INSERT INTO `produse` (ID,Stoc,Nume) VALUES (1," + req.body['newprodusqty'] + ",'" + req.body['newprodusname'] + "');", function (err, result) {
      if (err) throw err;
      console.log("S-a inserat " + req.body['newprodusname'] + " in tabela");
    });
    res.redirect("/admin");
  }

}
);
app.get("/autentificare", (req, res) => res.render("autentificare", { message: req.cookies['redirectedMessage'] }));

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată;
app.get("/chestionar", (req, res) => {
  const listaIntrebari = require("./intrebari.json");
  // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
  res.render("chestionar", { intrebari: listaIntrebari });
});

app.get("/log-out", (req, res) => {
  res.clearCookie('user');
  req.session.user = null;
  res.render("log-out");
});

app.get("/creare-bd", async (req, res) => {
  con.query("CREATE TABLE `produse` (`ID` INT UNSIGNED NOT NULL,`Stoc` INT UNSIGNED NOT NULL,`Nume` VARCHAR(50) NOT NULL DEFAULT '');", function (err, result) {
    if (err) throw err;
    console.log("S-a creat tabela");
    existaTabel = true;
  });
  res.redirect("/")
});

app.get("/inserare-bd", async (req, res) => {
  con.query("INSERT INTO `produse` (ID,Stoc,Nume) VALUES (1,40,'Constitutia Romaniei');", function (err, result) {
    if (err) throw err;
    console.log("S-a inserat Constitutia Romaniei in tabela");
  });
  con.query("INSERT INTO `produse` (ID,Stoc,Nume) VALUES (2,30,'Codul Civil');", function (err, result) {
    if (err) throw err;
    console.log("S-a inserat Codul Civil in tabela");
  });
  con.query("INSERT INTO `produse` (ID,Stoc,Nume) VALUES (3,35,'Codul Rutier');", function (err, result) {
    if (err) throw err;
    console.log("S-a inserat Codul Rutier in tabela");
  });
  con.query("INSERT INTO `produse` (ID,Stoc,Nume) VALUES (4,37,'Codul Muncii');", function (err, result) {
    if (err) throw err;
    console.log("S-a inserat Codul Muncii in tabela");
    existaTabel = true;
  });

  res.redirect("/")
});

app.post("/verificare-autentificare", async (req, res) => {

  let user = users.find((u) => u.utilizator == req.body.fusername && u.parola == req.body.fpwd)
  console.log(req.body)
  if (user) {
    console.log("s-a gasit");
    req.session.user = {
      ...user
    }
    delete req.session.user.parola;
    console.log(req.session.user)
    res.redirect("/")
  }
});
function convertToJSON(obj) {
  const jsonArr = [];

  for (const key in obj) {
    jsonArr.push({ intrebare: key, raspuns: parseInt(obj[key]) });
  }

  return jsonArr;
}

app.get("/adaugare_cos", (req, res) => {
  if (req.query.id != undefined) {
    console.log(req.query.id)
    if (req.session.cos != undefined) {
      cos = req.session.cos
    }
    else {
      console.log("Cos curent:", cos)
      cos.push(req.query.id)
      req.session.cos = cos
      console.log("Cos curent:", req.session.cos)
    }
  }
});

app.post("/rezultat-chestionar", (req, res) => {
  console.log(req.body);
  const listaIntrebari = require("./intrebari.json");
  const raspunsuriTrimise = convertToJSON(req.body);
  console.log(raspunsuriTrimise);
  res.render("rezultat-chestionar", {
    intrebari: listaIntrebari,
    raspunsuri: raspunsuriTrimise,
  });
});
app.listen(port, () =>
  console.log(`Serverul rulează la adresa http://localhost:${port}`)
);