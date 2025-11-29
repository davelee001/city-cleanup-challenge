<<<<<<< HEAD
# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
=======
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
>>>>>>> 9647358fd0db7725de75819c4909129451d77b74
