const express = require("express")
const app = express();
const path = require("path")
const { open } = require("sqlite")
const sqlite3 = require("sqlite3")
const bodyParser = require("body-parser")
const cors = require("cors")
const jwt = require("jsonwebtoken")

const dbPath = path.join(__dirname,"userdata.db")
let db = null; 

app.use(bodyParser.json())
app.use(cors())

const initializeTheServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })
        app.listen(3001, () => {
            console.log("server is running at http:localhost:3001 ")
        })
    }
    catch(e) {
        console.log(`DB ERROR ${e.message}`)
        process.exit(1)
    }
}

app.get("/clientData", async(request,response) => {
    const query = `
        SELECT *
        FROM client
    `;
    const queryResult = await db.all(query)
    response.send(queryResult)
})


// user log in api code
app.post("/login", async(request,response) => {
    const {email,password} = request.body;
    const verifyEmail = `
        select *
        from user
        where user_email = '${email}'`;
    const userEmailVerification = await db.get(verifyEmail)
    if (userEmailVerification === undefined) {
        response.status(400);
        response.send("User Email Can't Found In Records")
    }
    else {
        const databasePassword = userEmailVerification.user_password;
        if (password === databasePassword) {
            const payload = {
                name: userEmailVerification.username
            }
            const jwtToken = jwt.sign(payload,"my_token")
            response.send(jwtToken)
        }
        else {
            response.status(400);
            response.send("Password is Invalid")
        }
    }
})

// Retrieve client and user data 
app.get("/data/", async(request,response) => {
    const {mail} = request.query;
    const getResults = `
    SELECT user.id,client.client_name,client.client_code,user.username
    FROM client inner join user on client.id = user.client_id
    where user_email = ${mail}
    `;
    const runQuery = await db.get(getResults)
    response.send(runQuery)
})
    
// Retrieve the pending assessment data. 
app.get("/assessments/pending", async(request,response) => {
    const {id} = request.query
    const getAssessmentsData = `
        SELECT assigned_date,due_date,assessment_status,completion_date,assessment_name,assessment_type,assessment_link,is_active
        FROM (user left join user_assessment_map on user.id = user_assessment_map.user_id) as T inner join assessment on T.assessment_id = assessment.id
        where user.id = ${id} and (user_assessment_map.assessment_status= "In Progress" or user_assessment_map.assessment_status= "Not Started")
    `;
    const results = await db.get(getAssessmentsData)
    response.send(results) 
})

// Retrieve the completed assessment data 
app.get("/assessments/completed", async(request,response) => {
    const {id} = request.query
    const getAssessmentsData = `
        SELECT assigned_date,due_date,assessment_status,completion_date,assessment_name,assessment_type,assessment_link,is_active
        FROM (user left join user_assessment_map on user.id = user_assessment_map.user_id) as T inner join assessment on T.assessment_id = assessment.id
        where user.id = ${id} and user_assessment_map.assessment_status="Completed"
    `;
    const results = await db.get(getAssessmentsData)
    response.send(results) 
})

initializeTheServer()