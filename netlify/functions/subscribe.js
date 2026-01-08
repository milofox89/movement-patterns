// Netlify Serverless Function for Mailchimp Integration
// Save this as: netlify/functions/subscribe.js

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: ''
    };
  }

  try {
    // Get email from request body
    const { email } = JSON.parse(event.body);

    // Validate email
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid email address' 
        })
      };
    }

    // Get Mailchimp credentials from environment variables
    // These are set in Netlify dashboard under Site settings > Environment variables
    const API_KEY = process.env.MAILCHIMP_API_KEY;
    const LIST_ID = process.env.MAILCHIMP_LIST_ID;
    const DATA_CENTER = process.env.MAILCHIMP_DATA_CENTER; // e.g., 'us12'

    // Validate environment variables
    if (!API_KEY || !LIST_ID || !DATA_CENTER) {
      console.error('Missing Mailchimp credentials in environment variables');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: false,
          error: 'Server configuration error' 
        })
      };
    }

    // Mailchimp API endpoint
    const url = `https://${DATA_CENTER}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`;

    // Make request to Mailchimp
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed', // Use 'pending' for double opt-in
        tags: ['Movement Patterns Tool'],
        merge_fields: {
          SOURCE: 'Movement Patterns Tool',
          SIGNUP: new Date().toISOString()
        }
      })
    });

    const data = await response.json();

    // Handle success
    if (response.ok) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Successfully subscribed to Mailchimp!' 
        })
      };
    }

    // Handle "Member Exists" error (email already subscribed)
    if (data.title === 'Member Exists') {
      // Don't reveal if email is already subscribed (privacy/security)
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Thanks! You\'re all set.' 
        })
      };
    }

    // Handle other Mailchimp errors
    console.error('Mailchimp API error:', data);
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false,
        error: data.detail || 'Subscription failed',
        title: data.title
      })
    };

  } catch (error) {
    // Handle network/server errors
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ 
        success: false,
        error: 'An error occurred. Please try again.',
        details: error.message 
      })
    };
  }
};
