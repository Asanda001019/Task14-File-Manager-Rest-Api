// server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

// File path for the shopping list
const filePath = path.join(__dirname, 'shopping-list', 'data.json');

// Helper function to read the shopping list file
function readShoppingList(callback) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      callback(err, null);
    } else {
      try {
        const list = JSON.parse(data || '[]');
        callback(null, list);
      } catch (parseErr) {
        callback(parseErr, null);
      }
    }
  });
}

// Helper function to write to the shopping list file
function writeShoppingList(data, callback) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', callback);
}

// Start the server
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/shopping-list') {
    readShoppingList((err, list) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Could not read file' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
    });
  } else if (req.method === 'POST' && req.url === '/shopping-list') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const newItem = JSON.parse(body);
        if (!newItem.name || typeof newItem.quantity !== 'number' || newItem.quantity <= 0) {
          throw new Error('Invalid item');
        }
        readShoppingList((err, list) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Could not read file' }));
          }
          list.push(newItem);
          writeShoppingList(list, writeErr => {
            if (writeErr) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Could not write file' }));
            }
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(newItem));
          });
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid item format or data' }));
      }
    });
  } else if (req.method === 'PUT' && req.url.startsWith('/shopping-list/')) {
    const id = parseInt(req.url.split('/').pop(), 10);
    if (isNaN(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid item ID' }));
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const updatedItem = JSON.parse(body);
        readShoppingList((err, list) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Could not read file' }));
          }
          const itemIndex = list.findIndex((_, index) => index === id);
          if (itemIndex === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Item not found' }));
          }
          list[itemIndex] = { ...list[itemIndex], ...updatedItem };
          writeShoppingList(list, writeErr => {
            if (writeErr) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ error: 'Could not write file' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(list[itemIndex]));
          });
        });
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid data' }));
      }
    });
  } else if (req.method === 'DELETE' && req.url.startsWith('/shopping-list/')) {
    const id = parseInt(req.url.split('/').pop(), 10);
    if (isNaN(id)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid item ID' }));
    }
    readShoppingList((err, list) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Could not read file' }));
      }
      if (id < 0 || id >= list.length) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Item not found' }));
      }
      const deletedItem = list.splice(id, 1)[0];
      writeShoppingList(list, writeErr => {
        if (writeErr) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Could not write file' }));
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(deletedItem));
      });
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
