export type Story = {
    id: string;
    name: string;
    location: string;
    plan: string; // 'Everyday Yoga', 'Therapy', 'NRI'
    quote: string;
    beforeAfter?: string;
    rating: number;
    image?: string; // Placeholder for now
};

export type BlogPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    date: string;
    image?: string;
};

export const stories: Story[] = [
    {
        id: '1',
        name: 'Priya Sharma',
        location: 'London, UK',
        plan: 'NRI',
        quote: "I never thought online yoga could be this effective. My back pain is gone after 3 months of therapy.",
        beforeAfter: "Before: Chronic lower back pain, unable to sit for long hours. After: Pain-free, improved posture and flexibility.",
        rating: 5
    },
    {
        id: '2',
        name: 'Rahul Mehta',
        location: 'California, USA',
        plan: 'Everyday Yoga',
        quote: "The everyday classes help me stay grounded despite my hectic work schedule. It's my daily sanctuary.",
        rating: 5
    },
    {
        id: '3',
        name: 'Sarah Jenkins',
        location: 'Dubai, UAE',
        plan: 'NRI',
        quote: "Authentic, traditional, yet so accessible. The teachers really care about your progress.",
        rating: 4
    },
    {
        id: '4',
        name: 'Anjali Gupta',
        location: 'Mumbai, India',
        plan: 'Therapy',
        quote: "Yoga Therapy with Dr. Rao changed my life. My anxiety levels are significantly lower.",
        beforeAfter: "Before: High anxiety, insomnia. After: Better sleep, calm mind, reduced medication.",
        rating: 5
    },
    {
        id: '5',
        name: 'Michael Chen',
        location: 'Singapore',
        plan: 'Everyday Yoga',
        quote: "Great way to start the day. The morning batch fits perfectly into my routine.",
        rating: 5
    },
    {
        id: '6',
        name: 'Lakshmi N.',
        location: 'Bangalore, India',
        plan: 'Therapy',
        quote: "Post-natal recovery was tough until I started the gentle therapy sessions. Highly recommend.",
        rating: 5
    }
];

export const blogPosts: BlogPost[] = [
    {
        id: 'post_1',
        slug: 'yoga-for-back-pain',
        title: '5 Asanas to Relieve Lower Back Pain',
        excerpt: 'Discover gentle yoga poses that can help alleviate chronic back pain and improve spinal health.',
        category: 'Health',
        date: 'Nov 15, 2025',
        content: `
# 5 Asanas to Relieve Lower Back Pain

Back pain is a common ailment in our modern, sedentary lives. Yoga offers a gentle and effective way to strengthen the back and relieve tension.

## 1. Cat-Cow Pose (Marjaryasana-Bitilasana)
This gentle flow warms up the spine and relieves tension in the back and neck.

## 2. Child's Pose (Balasana)
A resting pose that gently stretches the lower back and hips.

## 3. Cobra Pose (Bhujangasana)
Strengthens the spine and stretches the chest, shoulders, and abdomen.

## 4. Sphinx Pose (Salamba Bhujangasana)
A gentler variation of Cobra, perfect for beginners.

## 5. Bridge Pose (Setu Bandhasana)
Strengthens the back, glutes, and hamstrings while stretching the chest and neck.

Remember to listen to your body and consult a doctor before starting any new exercise routine.
    `
    },
    {
        id: 'post_2',
        slug: 'travel-stress-relief',
        title: 'Yoga for Travel Stress & Jet Lag',
        excerpt: 'Simple breathing techniques and stretches to keep you grounded while traveling.',
        category: 'Travel',
        date: 'Nov 10, 2025',
        content: `
# Yoga for Travel Stress & Jet Lag

Traveling can be exciting but also exhausting. Long flights, changing time zones, and new environments can take a toll on your body and mind.

## Breathing for Calm
Practice **Nadi Shodhana (Alternate Nostril Breathing)** to balance your energy and calm the nervous system.

## Stretches for the Plane
- **Seated Spinal Twist**: Twist gently to the right and left to release tension in the spine.
- **Neck Rolls**: Slowly roll your head to release neck stiffness.
- **Ankle Circles**: Keep blood flowing in your legs.

## Grounding upon Arrival
Take a few minutes to practice **Tadasana (Mountain Pose)** barefoot on the ground (if possible) to reconnect with the earth.
    `
    },
    {
        id: 'post_3',
        slug: 'mindfulness-at-work',
        title: 'Integrating Mindfulness into Your Work Day',
        excerpt: 'Small practices to stay focused and calm during a busy work day.',
        category: 'Mindfulness',
        date: 'Nov 05, 2025',
        content: `
# Integrating Mindfulness into Your Work Day

Work can be stressful, but mindfulness can help you stay centered and productive.

## 1. Mindful Breathing
Take 5 minutes every hour to focus solely on your breath.

## 2. Conscious Eating
Step away from your screen for lunch. Eat slowly and savor each bite.

## 3. The "Pause" Button
Before reacting to a stressful email, take a deep breath and pause. Respond, don't react.
    `
    }
];
