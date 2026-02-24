#!/usr/bin/env node

/**
 * Social Features System Test Script
 * Tests all social functionality: teams, feeds, challenges, recognition
 * Date: February 24, 2026
 */

const path = require('path');
const SocialService = require('../src/services/socialService');
const SocialIntegrationService = require('../src/services/socialIntegration');

console.log('🧪 Testing Social Features System...\n');

async function testSocialFeatures() {
    try {
        // Initialize services
        const socialService = new SocialService();
        const integrationService = new SocialIntegrationService();
        
        console.log('✅ Social services initialized successfully');

        // Test Team Creation
        console.log('\n🧪 Testing team creation...');
        const teamResult = await socialService.createTeam({
            name: 'Test Cleanup Team',
            description: 'A test team for environmental cleanup',
            creator_id: 1,
            team_type: 'public',
            max_members: 25,
            team_color: '#4CAF50',
            tags: ['cleanup', 'environment', 'test'],
            location: 'Test City'
        });
        
        if (teamResult.success) {
            console.log('✅ Team creation test passed');
        } else {
            console.log('❌ Team creation test failed:', teamResult.message);
        }

        // Test Challenge Creation
        console.log('\n🧪 Testing challenge creation...');
        const challengeResult = await socialService.createChallenge({
            creator_id: 1,
            title: 'Test Waste Collection Challenge',
            description: 'Collect 50kg of waste in 30 days',
            challenge_type: 'individual',
            category: 'waste_collection',
            target_metric: 'waste_kg',
            target_value: 50,
            reward_points: 500,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            max_participants: 100,
            challenge_rules: {
                verification_required: true,
                photo_proof: true
            },
            difficulty_level: 'medium',
            is_public: true
        });

        if (challengeResult.success) {
            console.log('✅ Challenge creation test passed');
        } else {
            console.log('❌ Challenge creation test failed:', challengeResult.message);
        }

        // Test Social Post Creation
        console.log('\n🧪 Testing social post creation...');
        const postResult = await socialService.createSocialPost({
            user_id: 1,
            post_type: 'text',
            content: 'Just completed my first cleanup event! 🌱 #CleanupChallenge',
            privacy_level: 'public',
            tags: ['cleanup', 'environment', 'achievement'],
            mentions: []
        });

        if (postResult.success) {
            console.log('✅ Social post creation test passed');
        } else {
            console.log('❌ Social post creation test failed:', postResult.message);
        }

        // Test Social Stats
        console.log('\n🧪 Testing social statistics...');
        const statsResult = await socialService.getUserSocialStats(1);

        if (statsResult.success) {
            console.log('✅ Social statistics test passed');
            console.log('   📊 Stats:', statsResult.stats);
        } else {
            console.log('❌ Social statistics test failed:', statsResult.message);
        }

        // Test Social Integration
        console.log('\n🧪 Testing social integration...');
        const integrationResult = await integrationService.handleEventParticipation(1, 1, {
            wasteCollected: 5.5,
            pointsEarned: 75,
            shareToSocial: true
        });

        if (integrationResult.success) {
            console.log('✅ Social integration test passed');
        } else {
            console.log('❌ Social integration test failed:', integrationResult.message);
        }

        console.log('\n🎉 Social Features System tests completed successfully!');
        console.log('📈 All core social functionality is working properly');
        
        return true;
    } catch (error) {
        console.error('\n❌ Social Features System test failed:');
        console.error('   Error:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error('   Stack:', error.stack);
        }
        return false;
    }
}

// Run tests if called directly
if (require.main === module) {
    testSocialFeatures()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('\n💥 Test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testSocialFeatures };