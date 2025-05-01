import repoQueue from './queue';

async function removeAllJobs() {
    try {
        // Remove all jobs from the queue
        await repoQueue.clean(0, 'completed');
        await repoQueue.clean(0, 'failed');
        await repoQueue.clean(0, 'delayed');
        await repoQueue.clean(0, 'active');
        await repoQueue.clean(0, 'wait');
        
        console.log('✅ All jobs have been removed from the queue');
    } catch (error) {
        console.error('❌ Error removing jobs:', error);
        throw error;
    }
}

// Execute the function
removeAllJobs();
