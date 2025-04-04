import mongoose from 'mongoose';
import slugify from 'slugify';

const BlogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a post title'],
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Please provide post description'],
  },
  image: {
    type: String,
    default: 'default-blog.jpg'
  },
  imageAlt: {
    type: String,
    default: 'Blog post image'
  },
  author: {
    type: String,
    default: "Cut My Hair"
  },
  category: {
    type: String,
    enum: [
      'hair-care',
      'skin-care', 
      'makeup',
      'salon-news',
      'beauty-tips',
      'promotions',
      "self-care",
      "grooming"
    ],
    required: [true, 'Please select a category']
  },
}, {
  timestamps: true
});

// Create URL-safe slug from title before saving
BlogPostSchema.pre('save', function(next) {
  // Only update slug if title has changed or slug doesn't exist
  if (this.isModified('title') || !this.slug) {
    // Use slugify with options that make it more URL-friendly
    this.slug = slugify(this.title, { 
      lower: true,       // convert to lowercase
      strict: true,      // strip special characters
      remove: /[:]/g,    // explicitly remove colons which can cause URL encoding issues
      replacement: '-'   // replace spaces with hyphens
    });
  }
  next();
});

// Index for better performance
BlogPostSchema.index({ slug: 1 });
BlogPostSchema.index({ category: 1 });
BlogPostSchema.index({ createdAt: -1 });

const BlogPost = mongoose.model('BlogPost', BlogPostSchema);
export default BlogPost;