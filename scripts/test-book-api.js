// Simple script to test the book API directly
// Using ES modules as the project is configured with "type": "module"
import fetch from 'node-fetch';

// Test data for a new book
const testBook = {
  title: "Test Book",
  author: "Test Author",
  isbn: "1234567890",
  status: "to_read"
};

// Function to test creating a book
async function testCreateBook() {
  try {
    console.log('Attempting to create a book with data:', JSON.stringify(testBook, null, 2));
    
    const response = await fetch('http://127.0.0.1:5002/api/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testBook),
    });
    
    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
    
    try {
      // Try to parse as JSON
      const responseData = JSON.parse(responseText);
      console.log('Response data:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      // If not JSON, show as text
      console.log('Response text:', responseText);
    }
    
    if (response.ok) {
      console.log('Book created successfully!');
    } else {
      console.error('Failed to create book.');
    }
  } catch (error) {
    console.error('Error making API request:', error);
  }
}

// Run the test
testCreateBook();
