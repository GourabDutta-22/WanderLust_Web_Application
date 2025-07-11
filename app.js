if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
};

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require('./util/ExpressError.js');
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

//From Express Router
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// Atlas MongoDB URL
const dbUrl = process.env.ATLASDB_URL;

main()
    .then(() => {
        console.log("Successfully connected with DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(dbUrl);
}

//MongoDb Atlas
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR IN MONGO SESSION STORE", err);
});

//Cookie options set
const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie:{
        expires: Date.now() + 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
    },
};

// cookie set
app.use(session(sessionOptions));
//Flash setup
app.use(flash());
//Using passport for authentication
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//flash middleware using locals
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser=req.user;
    next();
});

//Using Express Route
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


//checking all APIs then send error if not matched
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

//Error handling middleware
app.use((err, req, res, next)=>{
    let {status=500, message="Something went wrong!"} = err;
    res.status(status).render("error.ejs", {message});
});

app.listen(8080, () => {
    console.log("Port is listening 8080");
});
