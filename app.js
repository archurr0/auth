/////// app.js

const path = require("node:path");
const { Pool } = require("pg");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcryptjs")

const pool = new Pool({
  connectionString: "postgresql://postgres:wei50664@localhost:5432/auth"
});

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM posts");
    let posts = rows;
    res.render("index", { user: req.user, posts: posts});
  });  

app.listen(3000, () => console.log("app listening on port 3000!"));

app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.post("/sign-up", async (req, res, next) => {
    try {
        bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
            if(err){
                return next(err);
            }else{
                await pool.query("INSERT INTO users (username, password, membership, admin) VALUES ($1, $2, $3, $4)", [
                    req.body.username,
                    hashedPassword,
                    "regular",
                    req.body.admin,
                  ]);
                  res.redirect("/");
            }
            // otherwise, store hashedPassword in DB
          });
        }catch(err) {
            return next(err);
          }
  });

app.get("/secret-pass", (req,res) => res.render("secret-password"));

app.post("/secret-pass", async (req,res,next)=>{
    try{
      if (req.body.secret === "banana"){
        await pool.query("UPDATE users SET membership = 'member' WHERE id = $1;", [
          req.user.id,
        ]);
        res.redirect("/");
      } else {
        res.redirect("/");
      }
    } catch(err){
      return next(err);
    }
  });

app.get("/new-post", (req,res) => res.render("new-post"));

app.post("/new-post", async (req,res,next)=>{
    try{
      var myDate = new Date();
      await pool.query("INSERT INTO posts (title, timestamp, text, author) VALUES ($1, $2, $3, $4)", [
        req.body.Title,
        myDate.getFullYear() + '-' +('0' + (myDate.getMonth()+1)).slice(-2)+ '-' +  ('0' + myDate.getDate()).slice(-2) + ' '+myDate.getHours()+ ':'+('0' + (myDate.getMinutes())).slice(-2)+ ':'+myDate.getSeconds(),
        req.body.Text,
        req.user.username,
      ]);
      res.redirect("/");
    } catch(err){
      return next(err);
    }
  });
  
  app.post('/delete/:id', async (req, res) => {
    await pool.query("DELETE FROM posts WHERE id=$1", [
      req.params.id
    ]);
    res.redirect('/');
});

passport.use(
new LocalStrategy(async (username, password, done) => {
    try {
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!user) {
        return done(null, false, { message: "Incorrect username" });
    }
    if (!match) {
        return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
    } catch(err) {
    return done(err);
    }
})
);

passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
passport.deserializeUser(async (id, done) => {
    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      const user = rows[0];
  
      done(null, user);
    } catch(err) {
      done(err);
    }
  });

app.post(
    "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/"
    })
  );
  
app.get("/log-out", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });
  
  
  