const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");


const express = require("express");
const serverless = require("serverless-http");

const app = express();

const USERS_TABLE = process.env.USERS_TABLE;
const HELP_REQUEST_TABLE = process.env.HELP_REQUEST_TABLE;
const HELP_DONE_TABLE = process.env.HELP_DONE_TABLE;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

function decodeJWT(token) {
  const base64UrlDecode = (str) => {
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
  };

  try {
      const parts = token.split('.');
      if (parts.length !== 3) {
          throw new Error('Invalid JWT token format');
      }

      // Decode payload (second part of the JWT)
      const decodedPayload = base64UrlDecode(parts[1]);
      return JSON.parse(decodedPayload);
  } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
  }
}

app.use(express.json());


//Users

app.get("/users/:userId", async (req, res) => {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    if (Item) {
      const { userId, name , telefone, email} = Item;
      res.json({ userId, name , telefone, email });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

app.post("/users", async (req, res) => {
  const { userId, name, telefone, email } = req.body;
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  } else if (typeof telefone !== "string") {
    res.status(400).json({ error: '"telefone" must be a string' });
  } else if (typeof email !== "string") {
    res.status(400).json({ error: '"email" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: { userId, name , telefone, email},
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.json({ userId, name , telefone, email});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }
});


app.post("/google/users", async (req, res) => {
  const { token } = req.body;
  if (typeof token !== "string") {
    res.status(400).json({ error: '"token" must be a string' });
  } 


  const payload = decodeJWT(token)
  const userId = payload.sub
  const name = payload.name
  const email = payload.email
  const picture = payload.picture
  
  const params = {
    TableName: USERS_TABLE,
    Item: { userId , name , picture, email},
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.header({'Access-Control-Allow-Origin' : '*'}).json({ userId, name , picture, email});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }


  
/*
  const params = {
    TableName: USERS_TABLE,
    Item: { userId, name , telefone, email},
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.json({ userId, name , telefone, email});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create user" });
  }
    */
});



//Help Request

app.get("/helprequest/:helpId", async (req, res) => {
  const params = {
    TableName: HELP_REQUEST_TABLE,
    Key: {
      helpId: req.params.helpId,
    },
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    if (Item) {
      const { helpId, name, meta, descricao, titulo, solicitante, categoria, prazo, imagem  } = Item;
      res.json({ helpId, name, meta, descricao, titulo, solicitante, categoria, prazo, imagem  });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "helpId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});

app.post("/helprequest", async (req, res) => {
  const { helpId, name, meta, descricao, titulo, solicitante, categoria, prazo, imagem  } = req.body;
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"helpId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  } else if (typeof meta !== "string") {
    res.status(400).json({ error: '"meta" must be a string' });
  } else if (typeof descricao !== "string") {
    res.status(400).json({ error: '"descricao" must be a string' });
  } else if (typeof titulo !== "string") {
    res.status(400).json({ error: '"titulo" must be a string' });
  } else if (typeof solicitante !== "string") {
    res.status(400).json({ error: '"solicitante" must be a string' });
  }

  const params = {
    TableName: HELP_REQUEST_TABLE,
    Item: { helpId, name, meta, descricao, titulo, solicitante, categoria, prazo, imagem},
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.json({ userId, name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create help request" });
  }
});

// Help Request Filter
app.get("/helprequest/filter/titulo/:titulo", async (req, res) => {
  const params = {
    TableName: HELP_REQUEST_TABLE,
    IndexName: 'titulo-index',
    FilterExpression: "contains(#titulo,:titulo)",
    ExpressionAttributeNames: {
      '#titulo': 'titulo',
  },
    ExpressionAttributeValues: { ":titulo": req.params.titulo }
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    if (Item) {
      const { helpId, name, meta, descricao, titulo, solicitante, categoria, prazo, imagem  } = Item;
      res.json({ helpId, name, meta, descricao, titulo, solicitante, categoria, prazo, imagem  });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "helpId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve user" });
  }
});



//Help Done

app.get("/helpdone/:helpId", async (req, res) => {
  const params = {
    TableName: HELP_DONE_TABLE,
    Key: {
      helpId: req.params.userId,
    },
  };

  try {
    const command = new GetCommand(params);
    const { Item } = await docClient.send(command);
    if (Item) {
      const { helpId, helpRequestId, valor, doador } = Item;
      res.json({ helpId, helpRequestId, valor, doador });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find help with provided "helpId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retrieve help" });
  }
});

app.post("/helpdone", async (req, res) => {
  const { helpId, helpRequestId, valor, doador } = req.body;
  if (typeof helpId !== "string") {
    res.status(400).json({ error: '"helpId" must be a string' });
  } else if (typeof helpRequestId !== "string") {
    res.status(400).json({ error: '"helpRequestId" must be a string' });
  } else if (typeof valor !== "string") {
    res.status(400).json({ error: '"valor" must be a string' });
  } else if (typeof doador !== "string") {
    res.status(400).json({ error: '"doador" must be a string' });
  }

  const params = {
    TableName: HELP_DONE_TABLE,
    Item: { helpId, helpRequestId, valor, doador },
  };

  try {
    const command = new PutCommand(params);
    await docClient.send(command);
    res.json({ helpId, helpRequestId, valor, doador });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create help" });
  }
});

//Any other
app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});
exports.handler = serverless(app);
