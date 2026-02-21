#!/usr/bin/env node
/**
 * Test Gamification System
 * This script tests the gamification APIs and validates the system integration
 */

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USERNAME = 'test_user_gamification';

class GamificationTester {
    constructor() {
        this.testsRun = 0;
        this.testsPassed = 0;
        this.testsFailed = 0;
    }

    log(message) {
        console.log(`🧪 ${message}`.cyan);
    }

    success(message) {
        console.log(`✅ ${message}`.green);
        this.testsPassed++;
    }

    error(message) {
        console.log(`❌ ${message}`.red);
        this.testsFailed++;
    }

    async runTest(description, test) {
        this.testsRun++;
        this.log(`Running: ${description}`);
        
        try {
            await test();
            this.success(`PASS: ${description}`);
        } catch (error) {
            this.error(`FAIL: ${description} - ${error.message}`);
        }
    }

    async testServerConnection() {
        const response = await axios.get(`${BASE_URL}/../health`);
        if (response.data.status !== 'ok') {
            throw new Error('Server health check failed');
        }
    }

    async testUserSignup() {
        const response = await axios.post(`${BASE_URL}/signup`, {
            username: TEST_USERNAME,
            password: 'test123'
        });
        
        if (!response.data.success) {
            throw new Error('Failed to create test user');
        }
    }

    async testDashboardAPI() {
        const response = await axios.get(`${BASE_URL}/gamification/dashboard/${TEST_USERNAME}`, {
            headers: { 'Authorization': TEST_USERNAME }
        });

        if (!response.data.success) {
            throw new Error('Dashboard API failed');
        }

        if (!response.data.dashboard.userStats) {
            throw new Error('Dashboard missing user stats');
        }
    }

    async testPointsAward() {
        const response = await axios.post(`${BASE_URL}/gamification/points/award`, {
            username: TEST_USERNAME,
            action: 'test_action',
            sourceId: 'test_source',
            metadata: { test: true }
        }, {
            headers: { 'Authorization': TEST_USERNAME }
        });

        if (!response.data.success) {
            throw new Error('Failed to award points');
        }

        if (response.data.pointsAwarded <= 0) {
            throw new Error('No points were awarded');
        }
    }

    async testLeaderboardAPI() {
        const response = await axios.get(`${BASE_URL}/gamification/leaderboard?type=points&limit=10`);

        if (!response.data.success) {
            throw new Error('Leaderboard API failed');
        }

        if (!Array.isArray(response.data.leaderboard)) {
            throw new Error('Leaderboard data is not an array');
        }
    }

    async testAchievementsAPI() {
        const response = await axios.get(`${BASE_URL}/gamification/achievements/${TEST_USERNAME}`, {
            headers: { 'Authorization': TEST_USERNAME }
        });

        if (!response.data.success) {
            throw new Error('Achievements API failed');
        }

        if (!Array.isArray(response.data.achievements)) {
            throw new Error('Achievements data is not an array');
        }
    }

    async testAvailableAchievements() {
        const response = await axios.get(`${BASE_URL}/gamification/achievements/available`);

        if (!response.data.success) {
            throw new Error('Available achievements API failed');
        }

        if (!Array.isArray(response.data.achievements)) {
            throw new Error('Available achievements is not an array');
        }
    }

    async testStreakAPI() {
        const response = await axios.get(`${BASE_URL}/gamification/streak/${TEST_USERNAME}`, {
            headers: { 'Authorization': TEST_USERNAME }
        });

        if (!response.data.success) {
            throw new Error('Streak API failed');
        }

        if (typeof response.data.streak !== 'object') {
            throw new Error('Streak data is invalid');
        }
    }

    async testEnvironmentalImpact() {
        const response = await axios.get(`${BASE_URL}/gamification/impact/${TEST_USERNAME}`, {
            headers: { 'Authorization': TEST_USERNAME }
        });

        if (!response.data.success) {
            throw new Error('Environmental impact API failed');
        }

        if (typeof response.data.environmentalImpact !== 'object') {
            throw new Error('Environmental impact data is invalid');
        }
    }

    async testSeasonalChallenges() {
        const response = await axios.get(`${BASE_URL}/gamification/challenges`);

        if (!response.data.success) {
            throw new Error('Seasonal challenges API failed');
        }

        if (!Array.isArray(response.data.challenges)) {
            throw new Error('Challenges data is not an array');
        }
    }

    async testUserLevel() {
        const response = await axios.get(`${BASE_URL}/gamification/level/${TEST_USERNAME}`, {
            headers: { 'Authorization': TEST_USERNAME }
        });

        if (!response.data.success) {
            throw new Error('User level API failed');
        }

        if (typeof response.data.level !== 'object') {
            throw new Error('Level data is invalid');
        }
    }

    async cleanupTestData() {
        // Note: This would typically clean up test data
        // For this demo, we'll leave the test user for manual inspection
        this.log('Cleanup: Test data preserved for manual inspection');
    }

    async runAllTests() {
        console.log('\n🚀 Starting Gamification System Tests'.bold.blue);
        console.log('=' * 50);

        // Test basic server connectivity
        await this.runTest('Server Connection', () => this.testServerConnection());

        // Test user creation
        await this.runTest('User Signup', () => this.testUserSignup());

        // Test core gamification APIs
        await this.runTest('Dashboard API', () => this.testDashboardAPI());
        await this.runTest('Points Award System', () => this.testPointsAward());
        await this.runTest('Leaderboard API', () => this.testLeaderboardAPI());
        await this.runTest('Achievements API', () => this.testAchievementsAPI());
        await this.runTest('Available Achievements API', () => this.testAvailableAchievements());
        await this.runTest('Streak Tracking API', () => this.testStreakAPI());
        await this.runTest('Environmental Impact API', () => this.testEnvironmentalImpact());
        await this.runTest('Seasonal Challenges API', () => this.testSeasonalChallenges());
        await this.runTest('User Level API', () => this.testUserLevel());

        // Cleanup
        await this.runTest('Cleanup Test Data', () => this.cleanupTestData());

        // Print results
        console.log('\n📊 Test Results'.bold.blue);
        console.log('=' * 50);
        console.log(`Total Tests: ${this.testsRun}`.yellow);
        console.log(`Passed: ${this.testsPassed}`.green);
        console.log(`Failed: ${this.testsFailed}`.red);

        if (this.testsFailed === 0) {
            console.log('\n🎉 All tests passed! Gamification system is working correctly.'.bold.green);
        } else {
            console.log(`\n⚠️  ${this.testsFailed} test(s) failed. Please check the errors above.`.bold.red);
        }

        return this.testsFailed === 0;
    }
}

async function main() {
    const tester = new GamificationTester();
    
    try {
        const success = await tester.runAllTests();
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error(`💥 Unexpected error: ${error.message}`.bold.red);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = GamificationTester;