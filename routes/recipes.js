import express from "express";
import Recipe from "../models/recipe";

const router = express.Router();

router.get("/", requestIndex);
router.get("/browse", requestBrowser);
router.get("/:uri(*)", requestRecipe);

function requestIndex(req, res) {
  res.render("recipes/index", {
    title: "Recipes",
    breadcrumbs: [
      { title: "Help & self-help", uri: "help" },
      { title: "Oral food intake", uri: "help/oral-food" }
    ]
  });
}

async function requestBrowser(req, res, next) {
  const recipes = await Recipe.find({})
    .select("title id tags")
    .sort("title");

  res.render("recipes/browser", {
    recipes,
    breadcrumbs: [
      { title: "Help & self-help", uri: "help" },
      { title: "Oral food intake", uri: "help/oral-food" },
      { title: "Recipes", uri: "help/oral-food/recipes" }
    ]
  });
}

async function requestRecipe(req, res, next) {
  const recipe = await Recipe.findOne({ id: req.params.uri });

  if (!recipe) return next();

  recipe.breadcrumbs = [
    { title: "Help & self-help", uri: "help" },
    { title: "Oral food intake", uri: "help/oral-food" },
    { title: "Recipes", uri: "help/oral-food/recipes" },
    { title: "Browser", uri: "help/oral-food/recipes/browse" }
  ];

  console.log(recipe);

  res.render("recipes/recipe", recipe);
}

module.exports = router;
