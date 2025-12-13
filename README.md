# 🎅 Secret Santa Generator

A serverless Secret Santa gift exchange app built on Cloudflare Workers with Durable Objects. Create parties, generate unique guest links, and automatically assign gift recipients - all running on Cloudflare's global edge network.

## ✨ Features

- **Instant Party Creation** - Create Secret Santa parties with 2-50 participants
- **Unique Guest Links** - Each participant gets a private link to view their assignment
- **Automatic Assignment** - Smart algorithm ensures no one gets themselves
- **Serverless & Global** - Runs on Cloudflare's edge network with sub-100ms response times
- **No Database Required** - Uses Durable Objects and KV for persistence
- **Beautiful UI** - Festive, mobile-responsive design with animated snow
- **Free Tier Compatible** - Uses SQLite-based Durable Objects (no paid plan needed)

## 🏗️ Architecture

- **Cloudflare Workers** - Serverless compute running TypeScript
- **Durable Objects** - Stateful storage for party data and assignments
- **KV Namespace** - Fast guest ID to party ID mapping
- **Static Assets** - HTML/CSS/JS served from edge cache

## 📋 Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works!)
- Wrangler CLI

## 🚀 Quick Start

### 1. Install Wrangler

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Clone and Setup

```bash
# Create project directory
mkdir secret-santa && cd secret-santa

# Create the file structure (see below)
```

### 4. Create KV Namespace

```bash
wrangler kv namespace create "GUEST_KV"
```

Copy the namespace ID from the output and update `wrangler.toml`.

### 5. Deploy

```bash
wrangler deploy
```

Your app will be live at: `https://secret-santa.YOUR-SUBDOMAIN.workers.dev`

## 📁 Project Structure

```
secret-santa/
├── src/
│   ├── index.ts          # Worker entry point with API routes
│   ├── party.ts          # Party Durable Object
│   ├── types.ts          # TypeScript type definitions
│   ├── utils.ts          # Assignment generation logic
│   └── kv.ts             # KV storage helpers
├── public/
│   ├── index.html        # Main party creation page
│   ├── style.css         # Festive CSS with animations
│   ├── app.js            # Frontend logic for party creation
│   └── guest.js          # Guest assignment page logic (optional)
├── wrangler.toml         # Cloudflare configuration
└── README.md
```

## ⚙️ Configuration

### wrangler.toml

```toml
name = "secret-santa"
main = "src/index.ts"
compatibility_date = "2025-11-21"
compatibility_flags = ["nodejs_compat"]

[[durable_objects.bindings]]
name = "PARTY_DO"
class_name = "Party"

[[kv_namespaces]]
binding = "GUEST_KV"
id = "YOUR_KV_NAMESPACE_ID"  # Replace with your KV ID

[assets]
directory = "./public"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["Party"]
```

## 🔌 API Endpoints

### Create Party
```http
POST /api/parties
Content-Type: application/json

{
  "name": "Christmas 2025",
  "budget": "$50",
  "criteria": "Something thoughtful",
  "guests": ["Alice", "Bob", "Charlie"]
}
```

**Response:**
```json
{
  "partyId": "uuid",
  "guestUrls": {
    "Alice": "https://your-worker.workers.dev/guest/uuid-1",
    "Bob": "https://your-worker.workers.dev/guest/uuid-2",
    "Charlie": "https://your-worker.workers.dev/guest/uuid-3"
  },
  "party": { ... }
}
```

### Get Guest Assignment
```http
GET /api/guest/{guestId}/assignment
```

**Response:**
```json
{
  "guestName": "Alice",
  "assignment": "Bob",
  "party": {
    "name": "Christmas 2025",
    "budget": "$50",
    "criteria": "Something thoughtful"
  }
}
```

## 🎨 Features & UI

- **Animated Snow Effect** - Festive falling snow animation
- **Responsive Design** - Works perfectly on mobile and desktop
- **Copy Link Buttons** - One-click copy for sharing guest links
- **Error Handling** - Clear error messages for validation issues
- **Loading States** - Smooth loading animations
- **Christmas Theme** - Red, green, and gold color scheme

## 🔧 Development

### Local Development

```bash
# Start local dev server with hot reload
wrangler dev

# View real-time logs
wrangler tail

# List deployments
wrangler deployments list
```

### Testing

Visit `http://localhost:8787` to test locally.

**Create a test party:**
1. Fill in party details
2. Add at least 2 guest names
3. Click "Create Secret Santa"
4. Copy and visit guest links to verify assignments

## 🌍 Custom Domain (Optional)

Add a custom domain in Cloudflare Dashboard:

1. Go to **Workers & Pages** > Your Worker
2. Click **Settings** > **Domains & Routes**
3. Click **Add** > **Custom Domain**
4. Enter your domain (e.g., `santa.yourdomain.com`)
5. Cloudflare automatically creates DNS records and SSL

## 📊 Data Storage

### Durable Objects
- **Party data** - Name, budget, criteria, guest list
- **Assignments** - Secret Santa pairings
- **Guest links** - Mapping of guest names to UUIDs

### KV Namespace
- **Guest ID lookup** - Fast retrieval of party ID from guest UUID
- **Key format**: `guest:{uuid}` → `{ partyId, guestName }`

## 🔒 Security Features

- **UUID-based guest links** - Unguessable 36-character identifiers
- **Input validation** - Sanitizes and validates all user input
- **CORS enabled** - Supports cross-origin requests
- **No self-assignment** - Algorithm prevents anyone from getting themselves
- **Unique guest names** - Enforces uniqueness within each party

## 🎯 Limitations

- **2-50 guests** per party
- **Guest name length** - Max 50 characters
- **Party name length** - Max 100 characters
- **No party editing** - Once created, parties cannot be modified (create a new one)

## 🐛 Troubleshooting

### "Guest link not found" error
- Guest ID may not have been stored in KV properly
- Check KV namespace ID in `wrangler.toml`
- Verify KV namespace exists: `wrangler kv namespace list`

### Static files not loading
- Ensure `public/` directory exists with all files
- Check `[assets]` configuration in `wrangler.toml`
- Guest page is served inline from Worker if assets fail

### Durable Objects error
- Ensure you're using `new_sqlite_classes` in migrations
- Verify `Party` class is exported in `src/index.ts`
- Check compatibility_date is recent

## 📝 License

MIT License - feel free to use for your holiday parties!

## 🎄 Contributing

Contributions welcome! Some ideas:
- Add rate limiting using Cloudflare's native API
- Implement party editing/deletion
- Add email notifications for assignments
- Support for exclusions (person X shouldn't buy for person Y)
- Admin dashboard to view all assignments

## 🙏 Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Workers KV](https://developers.cloudflare.com/kv/)
- TypeScript & modern CSS

***

**Made with ❤️ on Cloudflare Workers**

Need help? Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)