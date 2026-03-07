import express from "express"
import cors from "cors"
import { betterAuth } from "better-auth"
import Database from "better-sqlite3"

const app = express()

app.use(cors())
app.use(express.json())

const db = new Database("auth.db")

const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true
  }
})

app.use("/api/auth", auth.handler)

app.listen(3000, () => {
  console.log("Auth server running on port 3000")
})
