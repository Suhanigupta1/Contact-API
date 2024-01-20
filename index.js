const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;
const PHONEBOOK_FILE = 'phonebook.json';

let contacts = [];

// Load contacts from the JSON file on server startup
async function loadContacts() {
  try {
    const data = await fs.readFile(PHONEBOOK_FILE, 'utf8');
    const existingContacts = JSON.parse(data);
    contacts = existingContacts.concat(contacts);
    // const data = await fs.readFile(PHONEBOOK_FILE, 'utf8');
    // contacts = JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist or there's an error parsing it, initialize contacts as an empty array
    contacts = [];
  }
}

// Save contacts to the JSON file
async function saveContacts() {
  try {
    await fs.writeFile(PHONEBOOK_FILE, JSON.stringify(contacts, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving contacts to file:', error);
    throw error; // Re-throw the error to indicate that the operation failed
  }
}

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// Route to create a new contact
app.post('/contacts', async (req, res) => {
  try {
    const newContact = req.body;

    // Check for duplicate contacts
    const duplicateContact = contacts.find(contact => contact.phoneNo === newContact.phoneNo);
    if (duplicateContact) {
      return res.status(400).json({ error: 'Contact with the same phone number already exists' });
    }

    // Add the new contact to the contacts array
    contacts.push(newContact);

    // Save contacts to the JSON file
    await saveContacts();

    // Respond with the created contact
    res.status(201).json(newContact);
  } catch (error) {
    console.error('Error creating new contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to get all contacts
app.get('/contacts', (req, res) => {
  try {
    res.json(contacts);
  } catch (error) {
    console.error('Error retrieving contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to search contacts
app.get('/contacts/search/:query', (req, res) => {
  try {
    const searchQuery = req.params.query;

    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query parameter is required' });
    }

    const searchResults = contacts.filter(contact => {
      return (
        contact.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phoneNo.includes(searchQuery) ||
        contact.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to delete a contact by phone number
app.delete('/contacts/:phoneNo', async (req, res) => {
  try {
    const phoneNoToDelete = req.params.phoneNo;

    // Remove the contact with the specified phone number
    contacts = contacts.filter(contact => contact.phoneNo !== phoneNoToDelete);

    // Save contacts to the JSON file
    await saveContacts();

    // Respond with a success message
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to update a contact by phone number
app.patch('/contacts/:phoneNo', async (req, res) => {
  try {
    const phoneNoToUpdate = req.params.phoneNo;
    const updateFields = req.body;

    // Find the index of the contact with the specified phone number
    const contactIndex = contacts.findIndex(contact => contact.phoneNo === phoneNoToUpdate);

    // Check if the contact is found
    if (contactIndex === -1) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check if the new phone number already exists
    const duplicateContact = contacts.find(contact => contact.phoneNo === updateFields.phoneNo);
    if (duplicateContact && duplicateContact.phoneNo !== phoneNoToUpdate) {
      return res.status(400).json({ error: 'Contact with the new phone number already exists' });
    }

    // Update the specified fields
    contacts[contactIndex] = {
      ...contacts[contactIndex],
      ...updateFields
    };

    // Save contacts to the JSON file
    await saveContacts();

    // Respond with a success message and the updated contact
    res.json({ message: 'Contact updated successfully', updatedContact: contacts[contactIndex] });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

loadContacts().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});