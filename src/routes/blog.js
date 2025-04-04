import express from 'express';
import BlogPost from '../models/blog.js';
const router = express.Router();

router.post('/create',async(req,res)=>{
    const {title, description, category} = req.body;
    const response = await BlogPost.insertOne({
        title,
        description,
        category
    })
    return res.status(200).json({success:true, message:"Blog Added", response})
})

router.get('/get-all-blogs',async(req,res)=>{
    const blogs = await BlogPost.find({});
    return res.json({blogs})
})


// Route to get blog by slug with decoding
router.post('/get-blog-by-slug', async(req, res) => {
    try {
        const { slug } = req.body;
        
        if(!slug) {
            return res.status(400).json({success: false, message: "Slug is required"});
        }

        // Decode the slug to handle URL encoding issues
        const decodedSlug = decodeURIComponent(slug);
        console.log("Looking for slug:", decodedSlug);
        
        // Try to find with exact match first
        let blog = await BlogPost.findOne({ slug: decodedSlug });
        
        // If not found, try partial match (checking if slug is truncated)
        if (!blog) {
            console.log("Exact match not found, trying partial match");
            const partialMatches = await BlogPost.find({ 
                slug: { $regex: new RegExp('^' + decodedSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }
            });
            
            if (partialMatches.length > 0) {
                blog = partialMatches[0]; // Take the first match
                console.log("Found partial match:", blog.slug);
            }
        }
        
        if (!blog) {
            return res.status(404).json({success: false, message: "Blog post not found"});
        }
        
        return res.json({success: true, blog});
    } catch (error) {
        console.error("Error finding blog by slug:", error);
        return res.status(500).json({success: false, message: "Server error"});
    }
});

export default router;