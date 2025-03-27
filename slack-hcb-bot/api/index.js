require("dotenv").config();
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const HCB_CLIENT_ID = process.env.HCB_CLIENT_ID;
const HCB_CLIENT_SECRET = process.env.HCB_CLIENT_SECRET;
const HCB_REDIRECT_URI = process.env.HCB_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const APPROVED_ORGS = process.env.APPROVED_ORGS.split(",");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// verify slack req
function verifySlackRequest(req) {
    const timestamp = req.headers["x-slack-request-timestamp"];
    const sigBase = `v0:${timestamp}:${req.rawBody}`;
    const mySig = "v0=" + crypto.createHmac("sha256", SLACK_SIGNING_SECRET).update(sigBase).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(mySig, "utf8"), Buffer.from(req.headers["x-slack-signature"], "utf8"));
}

// oauth flow, with redirect
app.get("/auth", (req, res) => {
    res.redirect(`https://hcb.hackclub.com/oauth/authorize?client_id=${HCB_CLIENT_ID}&redirect_uri=${HCB_REDIRECT_URI}&scope=grants.write`);
});

// oauth callbaclk
app.get("/auth/callback", async (req, res) => {
    const { code, state } = req.query;
    try {
        const response = await axios.post("https://hcb.hackclub.com/oauth/token", {
            client_id: HCB_CLIENT_ID,
            client_secret: HCB_CLIENT_SECRET,
            code,
            redirect_uri: HCB_REDIRECT_URI
        });
        const accessToken = response.data.access_token;

        await supabase.from("tokens").upsert({ slack_user_id: state, hcb_access_token: accessToken });
        res.send("Authentication successful! You can now use /grant.");
    } catch (error) {
        console.error(error);
        res.send("OAuth authentication failed.");
    }
});

// /grant command
app.post("/grant", async (req, res) => {
    if (!verifySlackRequest(req)) {
        return res.status(400).send("Invalid request");
    }

    const { user_id, text } = req.body;
    const { data, error } = await supabase.from("tokens").select("hcb_access_token").eq("slack_user_id", user_id).single();
    if (error || !data) {
        return res.send(`Please authenticate first: ${HCB_REDIRECT_URI}/auth`);
    }
    
    const accessToken = data.hcb_access_token;
    const [amount, recipient, note] = text.split(" ");
    if (!amount || !recipient || !note) {
        return res.send("Usage: /grant <amount> <recipient> <note>");
    }

    try {
        // user org info
        const userResponse = await axios.get("https://hcb.hackclub.com/api/v3/users/me", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userOrgs = userResponse.data.orgs.map(org => org.id);
        const allowedOrg = userOrgs.find(org => APPROVED_ORGS.includes(org));
        
        if (!allowedOrg) {
            return res.send("You are not authorized to send grants from any approved organization.");
        }

        // grant req
        await axios.post("https://hcb.hackclub.com/api/v3/grants", {
            amount_cents: parseInt(amount) * 100,
            recipient_id: recipient,
            memo: note,
            org_id: allowedOrg
        }, { headers: { Authorization: `Bearer ${accessToken}` } });
        
        res.send(`Grant of $${amount} sent to ${recipient} from org ${allowedOrg}.`);
    } catch (error) {
        console.error(error);
        res.send("Failed to send grant.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
