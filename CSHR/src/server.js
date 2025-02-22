const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require('multer');
const session = require('express-session');
const mailjet = require('node-mailjet');

const collectionEmployees = require("./config").collectionEmployees;
const collectionStudents = require("./config").collectionStudents;
const collectionRecords = require("./config").collectionRecords;

const nocache = (req, res, next) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '-1');
    next();
};

const app = express();

// Convert data into JSON format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true, // Make sure to save uninitialized sessions
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.loggedIn) {
        return next();
    } else {
        return res.redirect('/');
    }
};

// Middleware to prevent caching
const preventCache = (req, res, next) => {
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '-1');
    next();
};

app.use(nocache);

app.get("/", nocache, (req, res) => {
    res.render("home");
});
app.get("/employee", nocache, (req, res) => {
    res.render("home");
});
app.get("/student", nocache, (req, res) => {
    res.render("cshr");
});
app.get("/about", nocache, (req, res) => {
    res.render("about");
});
app.get("/passwordReset", nocache, (req, res) => {
    res.render("passwordReset");
});
app.get("/admin", nocache, (req, res) => {
    res.render("admin");
});



// Multer configuration for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/') // Directory where photos will be stored
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname)); // Generate unique filename for the uploaded photo
    }
});
const upload = multer({ storage: storage });


// 🔹 REGISTER DOCTOR (EMPLOYEE)
app.post("/doctorsignup", upload.single('photo'), async (req, res) => {
    try {
        const data = {
            id: req.body.doctorid.toUpperCase(),
            name: req.body.username.toUpperCase(),
            gender: req.body.gender,
            qualification: req.body.qualification.toUpperCase(),
            date: req.body.doj,
            phone: req.body.phone,
            email: req.body.email,
            photo: req.file ? req.file.filename : null,
            password: req.body.password
        };

        // Check if the doctor already exists
        const existingUser = await collectionEmployees.findOne({ id: data.id });
        if (existingUser) {
            return res.render("doctorSignup", { error: "Employee already registered!" });
        }

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(data.password, 10);
        data.password = hashedPassword;

        // Save to database
        await collectionEmployees.create(data);
        console.log("Employee data added successfully!");

        // Redirect with success message
        return res.render("doctorSignup", { error: "Employee data added successfully!" });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.render("doctorSignup", { error: "An error occurred during signup!" });
    }
});



// 🔹 REGISTER STUDENT
app.post("/studentsignup", upload.single('photo'), async (req, res) => {
    try {
        const data = {
            id: req.body.studentid.toUpperCase(),
            name: req.body.studentname.toUpperCase(),
            gender: req.body.studentgender,
            phone: req.body.phone,
            email: req.body.email,
            photo: req.file ? req.file.filename : null,
            password: req.body.studentpassword
        };

        // Check if the student already exists
        const existingUser = await collectionStudents.findOne({ id: data.id });
        if (existingUser) {
            return res.render("studentSignup", { error: "Student already registered!" });
        }

        // Hash the password using bcrypt
        const hashedPassword = await bcrypt.hash(data.password, 10);
        data.password = hashedPassword;

        // Save to database
        await collectionStudents.create(data);
        console.log("Student data added successfully!");

        // Redirect with success message
        return res.render("studentSignup", { error: "Student data added successfully!" });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.render("studentSignup", { error: "An error occurred during signup!" });
    }
});


// Login Employee
app.post("/dataEntry", nocache, async (req, res, next) => {
    try {
        const check = await collectionEmployees.findOne({ id: req.body.employeeid.toUpperCase() });
        if (!check) {
            return res.render("home", { error: "Employee not found!" }); // Pass error message to home page
        }

        // Compare the hash password from database
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (isPasswordMatch) {
            // Set session attribute
            req.session.loggedIn = true;
            req.session.userId = check.id;
            req.session.save(() => {
                res.render("dataEntry", { doctor: check });
            });
        } else {
            return res.render("home", { error: "Incorrect password! Try again!" }); // Pass error message to home page
        }
    } catch (error) {
        console.error("Error occurred:", error);
        return res.render("error", { error: "An error occurred while processing your request." }); // Render error page with error message
    }
});

// Logout Employee
app.get('/logoutEmployee', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
                return res.redirect('/dataEntry'); // Redirect to dataEntry in case of error
            }
            res.clearCookie('connect.sid'); // Clear the session cookie
            return res.redirect('/'); // Redirect to the home page
        });
    } else {
        res.redirect('/'); // Redirect to the home page if no session found
    }
});



// Login student
app.post("/studentData", nocache, async (req, res, next) => {
    try {
        const studentId = req.body.studentid.toUpperCase();
        const studentPassword = req.body.studentpassword;

        const student = await collectionStudents.findOne({ id: studentId });

        if (!student) {
            return res.render("cshr", { error: "Student not found!" });
        }

        const isPasswordMatch = await bcrypt.compare(studentPassword, student.password);
        if (isPasswordMatch) {
            req.session.loggedIn = true;
            req.session.userId = student.id;
            const studentRecords = await collectionRecords.find({ id: studentId });
            req.session.save((err) => {
                if (err) {
                    console.error("Error saving session:", err);
                    return res.status(500).send("An error occurred while processing your request.");
                }
                res.render("studentData", { student: student, records: studentRecords });
            });
        }
        else {
            return res.render("cshr", { error: "Incorrect password! Try again!" });
        }
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).send("An error occurred while processing your request.");
    }
});

// Logout student
app.get('/logoutStudent', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
                return res.redirect('/studentData'); // Redirect to studentData in case of error
            }
            res.clearCookie('connect.sid'); // Clear the session cookie
            return res.redirect('/student'); // Redirect to the cshr page
        });
    } else {
        res.redirect('/student'); // Redirect to the cshr page if no session found
    }
});


app.get("/api/students/:studentId", async (req, res) => {
    const studentId = req.params.studentId;
    try {
      const student = await collectionStudents.findOne({ id: studentId });
      if (student) {
        res.json({ name: student.name, gender: student.gender });
      } else {
        res.status(404).send("Student not found"); // Send error response
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      res.status(500).send("An error occurred."); // Handle internal errors
    }
});


// Record data entry
app.post("/recordData", async (req, res) => {
    try {
        const data = {
            doctorname: req.body.doctorname,
            id: req.body.studentid.toUpperCase(),
            name: req.body.studentname,
            date: req.body.date,
            gender: req.body.gender,
            problem: req.body.problem === "Others" ? req.body.other_problem.toUpperCase() : req.body.problem.toUpperCase(),
            medicines: []
        };

        for (const key in req.body) {
            if (key.startsWith('medicine')) {
                data.medicines.push({ name: req.body[key].toUpperCase() });
            }
        }

        // Save the student record
        await collectionRecords.create(data);
        console.log("Problem recorded successfully!");

        // Get the doctor ID from session
        const doctorId = req.session.userId;
        const submittedDate = new Date(req.body.date); // Get the date from the form
        const submittedYear = submittedDate.getFullYear();
        const submittedMonth = submittedDate.getMonth(); // Keep 0-11 index for array access
 // 0 = January, 11 = December

        // Find the doctor's stats for the current year
        let doctorStats = await DoctorStat.findOne({ doctorId, year: submittedYear });

if (!doctorStats) {
    doctorStats = new DoctorStat({
        doctorId,
        year: submittedYear,
        months: Array(12).fill().map((_, i) => ({
            month: i, // Store month index (0-11)
            shifts: 0,
            casesSolved: 0,
            leaves: 0,
            salary: "Pending"
        }))
    });
}

// Increment the number of cases solved for the correct month
doctorStats.months[submittedMonth].casesSolved += 1;

// Save the updated statistics
await doctorStats.save();


        // Fetch doctor data again
        const doctor = await collectionEmployees.findOne({ id: doctorId });
        res.render("dataEntry", { doctor: doctor, info: "Problem recorded successfully for ${req.body.studentid.toUpperCase()}" });

    } catch (error) {
        console.error("Error occurred:", error);

        // Fetch doctor data again
        const doctor = await collectionEmployees.findOne({ id: req.session.userId });
        res.render("dataEntry", { doctor: doctor, info: "An error occurred while recording the problem." });
    }
});




const { DoctorStat } = require('./config'); // Adjust the path as needed

// Fetch doctor statistics by year
app.get('/api/doctor/stats', async (req, res) => {
    const { doctorId, year } = req.query;

    try {
        // Find statistics for the given doctor and year
        const stats = await DoctorStat.findOne({ doctorId, year });

        if (!stats) {
            return res.status(404).json({ error: "No statistics found for the given year." });
        }

        // Format the data for the frontend
        const formattedData = {
            shifts: stats.months.map(month => month.shifts),
            casesSolved: stats.months.map(month => month.casesSolved),
            months: stats.months.map(month => ({
                month: month.month + 1,
                leaves: month.leaves,
                salary: month.salary
            }))
        };

        res.json(formattedData);
    } catch (error) {
        console.error("Error fetching doctor statistics:", error);
        res.status(500).json({ error: "An error occurred while fetching statistics." });
    }
});

// Protected route for data entry
app.get("/dataEntry", nocache, isAuthenticated, (req, res) => {
    res.render("dataEntry");
});


const isAdminAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return next();
    } else {
        res.redirect("/admin"); // Redirect back to login if not authenticated
    }
};

// Protect the admin dashboard route
app.get("/chsrDatabase", isAdminAuthenticated, (req, res) => {
    res.render("cshrDatabase");
});




app.get("/studentSignup", isAdminAuthenticated, (req, res) => {
    res.render("studentSignup");
});

// 🔹 SERVE DOCTOR SIGNUP PAGE (ONLY ADMIN CAN ACCESS)
app.get("/doctorSignup", isAdminAuthenticated, (req, res) => {
    res.render("doctorSignup");
});

// 🔹 HOME BUTTON IN SIGNUP PAGES REDIRECTS BACK TO DASHBOARD
app.get("/backToDashboard", isAdminAuthenticated, (req, res) => {
    res.redirect("/cshrDatabase");
});

// 🔹 ADMIN LOGIN
app.post("/adminLogin", async (req, res) => {
    const { adminid, password } = req.body;

    // Define a static admin user (replace with database storage for production)
    const adminCredentials = {
        id: "1",
        password: await bcrypt.hash("1", 10)  // Hash the password
    };

    const isPasswordMatch = await bcrypt.compare(password, adminCredentials.password);

    if (adminid === adminCredentials.id && isPasswordMatch) {
        req.session.loggedIn = true;
        req.session.adminId = adminid;
        res.redirect("/cshrDatabase"); // Redirect to admin dashboard
    } else {
        res.render("admin", { error: "Invalid Admin ID or Password" });
    }
});

// 🔹 ADMIN DASHBOARD (Displays Students, Doctors & Records)
app.get("/cshrDatabase", isAdminAuthenticated, async (req, res) => {
    try {
        const students = await collectionStudents.find({});
        const employees = await collectionEmployees.find({});
        const records = await collectionRecords.find({});
        res.render("cshrDatabase", { students, employees, records });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.render("cshrDatabase", { students: [], employees: [], records: [] });
    }
});

// 🔹 LOGOUT ADMIN
app.get("/logoutAdmin", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout Error:", err);
            return res.redirect("/cshrDatabase");
        }
        res.clearCookie('connect.sid');
        res.redirect("/admin");
    });
});

// 🔹 UPDATE USER DETAILS (STUDENT / DOCTOR)
app.post("/updateUser", isAdminAuthenticated, async (req, res) => {
    const { id, name, gender, email, phone, password } = req.body;
    
    try {
        let user = await collectionStudents.findOne({ id }) || await collectionEmployees.findOne({ id });

        if (!user) {
            return res.json({ success: false, message: "User not found!" });
        }

        user.name = name;
        user.gender = gender;
        user.email = email;
        user.phone = phone;

        if (password.length >= 4) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        res.json({ success: true, message: "User updated successfully!" });

    } catch (error) {
        console.error("Update Error:", error);
        res.json({ success: false, message: "Error updating user!" });
    }
});

// 🔹 DELETE USER (STUDENT / DOCTOR)
app.post("/deleteUser", isAdminAuthenticated, async (req, res) => {
    const { id } = req.body;

    try {
        const deletedUser = await collectionStudents.findOneAndDelete({ id }) || await collectionEmployees.findOneAndDelete({ id });

        if (!deletedUser) {
            return res.json({ success: false, message: "User not found!" });
        }

        res.json({ success: true, message: "User deleted successfully!" });

    } catch (error) {
        console.error("Delete Error:", error);
        res.json({ success: false, message: "Error deleting user!" });
    }
});

// 🔹 FETCH ALL MEDICAL RECORDS
app.get("/getRecords", isAdminAuthenticated, async (req, res) => {
    try {
        const records = await collectionRecords.find({});
        res.json({ success: true, records });

    } catch (error) {
        console.error("Fetch Records Error:", error);
        res.json({ success: false, message: "Error fetching records!" });
    }
});

// 🔹 FILTER MEDICAL RECORDS BASED ON CRITERIA
app.post("/getFilteredRecords", isAdminAuthenticated, async (req, res) => {
    const { criteria, value } = req.body;
    let filter = {};

    if (criteria && value) {
        filter[criteria] = value;
    }

    try {
        const records = await collectionRecords.find(filter);
        res.json({ success: true, records });

    } catch (error) {
        console.error("Filter Records Error:", error);
        res.json({ success: false, message: "Error filtering records!" });
    }
});

// 🔹 DELETE A MEDICAL RECORD
app.delete("/deleteRecord", isAdminAuthenticated, async (req, res) => {
    const { id } = req.body;

    try {
        const deletedRecord = await collectionRecords.findOneAndDelete({ id });

        if (!deletedRecord) {
            return res.json({ success: false, message: "Record not found!" });
        }

        res.json({ success: true, message: "Record deleted successfully!" });

    } catch (error) {
        console.error("Delete Record Error:", error);
        res.json({ success: false, message: "Error deleting record!" });
    }
});




// Start server
const port = 3000;
app.listen(port, () => {
    console.log("Server running on port ${port}");
});
