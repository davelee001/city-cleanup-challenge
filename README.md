# city-cleanup-challenge
A location-based mini-game where players take photos of clean spots, environmental improvements, or community service activities (verified by simple AI).  Players earn MiniPay rewards for completing real-world tasks  Daily missions (e.g., “snap a clean street,” “collect 3 recyclable bottles”)  Leaderboards + weekly bonuses


City Clean-Up Challenge

A mobile-first environmental action app powered by MiniPay


OVERVIEW

City Clean-Up Challenge is a gamified mobile app that encourages users to clean their environment and get rewarded instantly through MiniPay. Users complete clean-up tasks, submit photos, and earn stablecoin rewards (cUSD, USDC, etc.) using the Celo blockchain.


FEATURES

Clean-up missions (daily & weekly)

Photo/video submission system

AI verification (authenticity, location, timestamp)

MiniPay-powered micro-rewards

Leaderboards & badges

Eco-friendly gamification

In-app marketplace (optional)


ARCHITECTURE

Frontend: React Native (mobile-first)

Backend: Node.js + Express + PostgreSQL

Blockchain: Celo + MiniPay

AI Verification: Lightweight image-analysis module


TECH STACK

React Native

Node.js

PostgreSQL

Celo SDK

MiniPay SDK

Hardhat (smart contracts)


MINIPAY INTEGRATION

The app uses MiniPay to:

Connect user wallet

Read wallet address

Send instant stablecoin rewards

Log transaction hashes

Docs: docs/minipay-integration.md


ANTIFRAUD SYSTEM

GPS verification

Image metadata checks

Duplicate image detection

Rate-limiting

Device fingerprinting


HOW TO RUN LOCALLY
Frontend
cd frontend
npm install
npm start

Backend
cd backend
npm install
npm run dev


SMART CONTRACTS
cd smart-contracts
npm install
npx hardhat test


CONTRIBUTING

Pull requests are welcome!
Read CONTRIBUTING.md for guidelines.


LICENSE

MIT License
