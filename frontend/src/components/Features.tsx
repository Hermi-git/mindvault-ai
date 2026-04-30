'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { 
  Upload, 
  Search, 
  MessageSquare, 
  Lock, 
  BarChart3, 
  Users 
} from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Smart Document Ingestion',
    description: 'Upload PDFs, Markdown, and text files. Automatic chunking and embedding processing.',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    description: 'Find exactly what you need with AI-powered semantic search across all documents.',
  },
  {
    icon: MessageSquare,
    title: 'Conversational AI',
    description: 'Chat with your knowledge base using natural language. Get cited, grounded answers.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'End-to-end encryption, SOC 2 compliant, with tenant isolation by default.',
  },
  {
    icon: BarChart3,
    title: 'Usage Analytics',
    description: 'Track token usage, document metrics, and monitor your organization\'s activity.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share knowledge bases with your team. Control access with role-based permissions.',
  },
];

export function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.5,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section
      id="features"
      className={cn(
        'relative w-full py-20 md:py-32',
        'bg-slate-950 px-6'
      )}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className={cn(
            'absolute top-1/2 right-0 w-96 h-96',
            'bg-linear-to-l from-indigo-600/20 to-transparent',
            'rounded-full blur-3xl'
          )}
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="relative z-10 max-w-7xl mx-auto"
      >
        {/* Section Header */}
        <motion.div variants={itemVariants} className="text-center mb-16">
          <h2 className={cn(
            'text-4xl md:text-5xl font-bold mb-4',
            'bg-linear-to-r from-slate-50 to-cyan-400',
            'bg-clip-text text-transparent'
          )}>
            Everything You Need
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A complete suite of tools to transform your documents into intelligent knowledge bases.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              whileHover={{ y: -5 }}
              className={cn(
                'p-6 rounded-xl',
                'bg-linear-to-br from-white/5 to-white/0',
                'border border-slate-700/30 hover:border-cyan-400/30',
                'backdrop-blur-sm',
                'transition-all duration-300 group'
              )}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  'w-12 h-12 rounded-lg mb-4',
                  'bg-linear-to-br from-indigo-600 to-cyan-400',
                  'flex items-center justify-center text-white',
                  'group-hover:shadow-lg group-hover:shadow-indigo-500/50',
                  'transition-shadow duration-300'
                )}
              >
                <feature.icon size={24} />
              </motion.div>

              <h3 className="text-lg font-semibold text-slate-50 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
