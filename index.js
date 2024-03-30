import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.POSTGRES_URL,
});
db.connect();
let currentUserId;
let users = [];
let items = [];

async function getCurrentUser(currentUserId) {
  const result = await db.query("select * from users");
  if (result.rows.length > 0) {
    users = result.rows;
    return users.find((user) => user.id == currentUserId);
  } else {
    users = [];
    return users;
  }
}
async function getFirstUser() {
  const result = await db.query("select id from users");
  if (result.rows.length > 0) {
    return result.rows[0].id;
  } else {
    users = [];
    return users;
  }
}
app.get("/", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(currentUserId);
    if (users.length > 0) {
      const result = await db.query("SELECT * FROM items where user_id = $1", [
        currentUserId,
      ]);
      res.render("index.ejs", {
        listTitle: currentUser.name + "'s list",
        users: users,
        listItems: result.rows,
        color: currentUser.color,
      });
    } else {
      res.render("index.ejs", {
        message: "There are no members, become one 😊",
      });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/add", async (req, res) => {
  const item = req.body.newItem;
  try {
    await db.query("INSERT INTO items (title, user_id) VALUES ($1, $2)", [
      item,
      currentUserId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/edit", async (req, res) => {
  try {
    await db.query("UPDATE items SET title = $1 WHERE id = $2", [
      req.body.updatedItemTitle,
      req.body.updatedItemId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/delete", async (req, res) => {
  try {
    await db.query("DELETE FROM items WHERE id = $1", [req.body.deleteItemId]);
    res.redirect("/");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/user", async (req, res) => {
  try {
    if (req.body.add === "new") {
      res.render("new.ejs");
    } else {
      currentUserId = req.body.user;
      res.redirect("/");
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",
      [name, color]
    );
    currentUserId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/deleteMember", async (req, res) => {
  try {
    await db.query("DELETE FROM items WHERE user_id = $1", [currentUserId]);
    await db.query("DELETE FROM users WHERE id = $1", [currentUserId]);

    currentUserId = await getFirstUser();
    res.redirect("/");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
