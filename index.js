const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser'); // Add this line
const app = express();
const fs = require('fs'); // Import the 'fs' module
const { promisify } = require('util'); // Import 'promisify' from 'util' module
const readFileAsync = promisify(fs.readFile); // Promisify fs.readFile
const session = require('express-session');
const bcrypt = require('bcrypt');
const PORT = process.env.PORT || 3000;
const mongoURI = 'mongodb+srv://sootal:velki123@cluster0.zvqfza8.mongodb.net/File';


mongoose.connect(mongoURI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB', err));

app.get('/', async (req, res) => {
  try {
    const admins = await User.find({ type: 'MAIN ADMIN' });
    const html = await fs.promises.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8');
    const modifiedHtml = html.replace('<!-- USERS_DATA -->', generateTableRows(admins));

    // Log the modified HTML to ensure it looks correct
    console.log(modifiedHtml);

    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading admin users from MongoDB or HTML file');
  }
});

app.use(session({
  secret: '8191983',
  resave: false,
  saveUninitialized: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}



const Schema = mongoose.Schema;

const loginCredentialSchema = new Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
});

const LoginCredential = mongoose.model('LoginCredential', loginCredentialSchema);

app.use(bodyParser.urlencoded({ extended: true })); // Add this line to parse urlencoded bodies
app.use(bodyParser.json()); 

// Add this line to parse JSON bodies

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    // Find the user's credentials in the LoginCredential collection
    const user = await LoginCredential.findOne({ username });

    if (!user || user.password !== password) {
      return res.status(401).send('Invalid username or password');
    }

    // Set isAuthenticated to true in session
    req.session.isAuthenticated = true;
    req.session.username = username;

    // Redirect to /admin route on successful login
    res.redirect('/admin');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// GET route for admin page (requires authentication)


  // nction to add a new username and password to MongoDB





// Route to display user list with delete buttons
app.get('/admin', isAuthenticated, async (req, res) => {
  try {
    const users = await User.find({}); // Fetch all users

    // Read the admin.html template
    let html = await fs.promises.readFile(path.join(__dirname, 'admin.html'), 'utf8');

    // Replace placeholders in HTML with user data
    html = replacePlaceholders(html, users);

    // Send the modified HTML to the client
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading users from MongoDB');
  }
});

// Function to replace placeholders in HTML with user data
function replacePlaceholders(html, users) {
  let rows = '';
  users.forEach(user => {
    rows += `
      <tr>
        <td>${user.type}</td>
        <td>${user.name}</td>
        <td>${user.phoneNumber}</td>
        <td>
          <form method="post" action="/delete">
            <input type="hidden" name="phoneNumber" value="${user.phoneNumber}">
            <input type="hidden" name="type" value="${user.type}">
            <button type="submit" class="btn btn-danger">Delete</button>
          </form>
        </td>
      </tr>
    `;
  });

  // Replace the <!--USER_ROWS--> placeholder in the HTML with the generated rows
  return html.replace('<!--USER_ROWS-->', rows);
}


app.get('/changepassword', (req, res) => {
  res.sendFile(path.join(__dirname, 'changepassword.html'));
});



// Route to handle the change password form submission
app.post('/change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.status(400).send('All fields are required');
  }

  try {
    // Find the user's credentials in the LoginCredential collection
    const user = await LoginCredential.findOne({ username, password: oldPassword });

    if (!user) {
      return res.status(401).send('Invalid username or password');
    }

    // Update the password for the user
    user.password = newPassword;
    await user.save();

    return res.status(200).send('Password changed successfully');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Internal Server Error');
  }
});

// GET route for login page




app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//static folder
app.use(express.static(path.join(__dirname, 'public')));

// Function to generate WhatsApp link
function createWhatsAppLink(phoneNumber) {
  return `https://api.whatsapp.com/send?phone=${phoneNumber}`;
}

// Route to serve the admin.html file

// Route to add a new user to MongoDB
app.get('/adduser', isAuthenticated, (req, res) => {
  // Send the adduser.html file as response
  res.sendFile(path.join(__dirname, 'adduser.html'));
});

// Route to handle adding a new user
app.post('/adduser', async (req, res) => {
  const { id, type, name, messengerLink, phoneNumber } = req.body;

  if (!type || !name || !phoneNumber) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const phoneAppLink = createWhatsAppLink(phoneNumber); // Generate WhatsApp link

  try {
    const newUser = new User({
      type,
      id,
      name,
      phoneAppLink,
      messengerLink,
      phoneNumber
    });

    const savedUser = await newUser.save();
    res.status(201).json({ message: 'User added successfully', newUser: savedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding user to MongoDB' });
  }
});

// Route to delete a user from MongoDB
// Route to delete a user from MongoDB based on phone number and type
app.post('/delete', async (req, res) => {
  const { phoneNumber, type } = req.body;

  if (!phoneNumber || !type) {
    return res.status(400).send('Phone number and type are required for deletion');
  }

  try {
    // Assuming you have a mongoose model called User
    const userToDelete = await User.findOneAndDelete({ phoneNumber, type });

    if (!userToDelete) {
      return res.status(404).send('User not found');
    }

    // Render a success message
    res.status(200).send(`
      <h2>User deleted successfully</h2>
      <p>Deleted user with phone number: ${userToDelete.phoneNumber} and type: ${userToDelete.type}</p>
      <a href="/">Go Back</a>
    `);
  } catch (err) {
    console.error(err);
    // Render an error message
    res.status(500).send('Error deleting user from MongoDB');
  }
});



// Create a Mongoose Schema for the admins collection

// Create a Mongoose Schema for the cs collection
// Create a Mongoose Schema for the users collection
const userSchema = new mongoose.Schema({
  id: Number,
  type: String,
  name: String,
  phoneNumber: String,
  phoneAppLink: String,
  messengerLink: String
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// Route to fetch users of type "admin" from MongoDB users collection



// Route to fetch users of type "sa" from MongoDB users collection
app.get('/sa', async (req, res) => {
  try {
    const admins = await User.find({ type: 'SUPER ADMIN' }); // Fetch all users of type "admin"
    const html = await fs.promises.readFile(path.join(__dirname, 'public', 'sa.html'), 'utf8');

    // Replace placeholders in HTML with admin data
    const modifiedHtml = html.replace('<!-- USERS_DATA -->', generateTableRows(admins));

    // Send the modified HTML to the client
    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading admin users from MongoDB or HTML file');
  }
});

// Route to fetch users of type "cs" from MongoDB users collection
app.get('/cs', async (req, res) => {
  try {
    const admins = await User.find({ type: 'CUSTOMER SUPPORT' }); // Fetch all users of type "admin"
    const html = await fs.promises.readFile(path.join(__dirname, 'public', 'cs.html'), 'utf8');

    // Replace placeholders in HTML with admin data
    const modifiedHtml = html.replace('<!-- USERS_DATA -->', generateTableRows(admins));

    // Send the modified HTML to the client
    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading admin users from MongoDB or HTML file');
  }
});

app.get('/ad', async (req, res) => {
  try {
    const admins = await User.find({ type: 'ADMIN' }); // Fetch all users of type "admin"
    const html = await fs.promises.readFile(path.join(__dirname, 'public', 'ad.html'), 'utf8');

    // Replace placeholders in HTML with admin data
    const modifiedHtml = html.replace('<!-- USERS_DATA -->', generateTableRows(admins));

    // Send the modified HTML to the client
    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading admin users from MongoDB or HTML file');
  }
});

app.get('/sag', async (req, res) => {
  try {
    const admins = await User.find({ type: 'SUPER AGENT' }); // Fetch all users of type "admin"
    const html = await fs.promises.readFile(path.join(__dirname, 'public', 'sag.html'), 'utf8');

    // Replace placeholders in HTML with admin data
    const modifiedHtml = html.replace('<!-- USERS_DATA -->', generateTableRows(admins));

    // Send the modified HTML to the client
    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading admin users from MongoDB or HTML file');
  }
});

app.get('/ma', async (req, res) => {
  try {
    const admins = await User.find({ type: 'MASTER AGENT' }); // Fetch all users of type "admin"
    const html = await fs.promises.readFile(path.join(__dirname, 'public', 'mag.html'), 'utf8');

    // Replace placeholders in HTML with admin data
    const modifiedHtml = html.replace('<!-- USERS_DATA -->', generateTableRows(admins));

    // Send the modified HTML to the client
    res.send(modifiedHtml);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading admin users from MongoDB or HTML file');
  }
});

function generateTableRows(users) {
  let rows = ''; // Initialize an empty string to store the table rows

  users.forEach(user => { // Loop through each user in the 'users' array
    const isComplainUser = ['SUPER ADMIN', 'SUPER AGENT', 'MASTER AGENT'].includes(user.type);
    // Check if the user's type is one of 'SUPER ADMIN', 'SUPER AGENT', or 'MASTER AGENT'

    const complainLink = isComplainUser ? user.phoneAppLink : '';
    // If it's a "complain user", set the 'complainLink' to 'user.phoneAppLink', otherwise set it to an empty string

    if (isComplainUser) {
      // If it's a "complain user", create a table row with a "Complain" link
      rows += `
        <tr>
          <td style="width: 13%">${user.type}</td>
          <td style="width: 7%">${user.id}</td>
          <td style="width: 25%">${user.name}</td>
          <td style="width: 15%"><a href="${user.phoneAppLink}" target="_blank"><img src="images/ws.png" alt="WhatsApp" style="max-width: 30px; max-height: 30px;"></a></td>
          <td style="width: 15%"><a href="${user.messengerLink}" target="_blank"><img src="https://i.ibb.co/QKPB6CQ/pngwing-com-31.png" alt="msg" style="max-width: 30px; max-height: 30px;"></a></td>
          <td style="width: 25%">${user.phoneNumber}</td>
          <td style="width: 15%"><a href="${user.phoneAppLink}"</a>Complain</td>
        </tr>
      `;
    } else {
      // If it's not a "complain user", create a table row without a "Complain" link
      rows += `
        <tr>
          <td style="width: 13%">${user.type}</td>
          <td style="width: 7%">${user.id}</td>
          <td style="width: 25%">${user.name}</td>
          <td style="width: 15%"><a href="${user.phoneAppLink}" target="_blank"><img src="images/ws.png" alt="WhatsApp" style="max-width: 30px; max-height: 30px;"></a></td>
          <td style="width: 15%"><a href="${user.messengerLink}" target="_blank"><img src="https://i.ibb.co/QKPB6CQ/pngwing-com-31.png" alt="msg" style="max-width: 30px; max-height: 30px;"></a></td>
          <td style="width: 25%">${user.phoneNumber}</td>
          <td></td>
        </tr>
      `;
    }
  });

  return rows; // Return the generated table rows
}





// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
