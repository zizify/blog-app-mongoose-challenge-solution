'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.info('seeding blog data');
  const seedData = [];

  for (let i = 1; i <= 10; i++) {
    seedData.push(generateBlogData());
  }

  return BlogPost.insertMany(seedData);
}

function generateBlogData() {
  return {
    title: faker.random.words(),
    content: faker.lorem.words(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    }
  };
}

function tearDownDb() {
  return mongoose.connection.dropDatabase();
}

describe('Blogs API source', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return tearDownDb()
      .then(() => seedBlogData());
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('should return all existing blogs', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.lengthOf(count);
        });
    });

    it('should return blogs with correct fields', function() {

      let resBlogPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.length.of.at.least(1);

          res.body.forEach(function(blogpost) {
            blogpost.should.be.a('object');
            blogpost.should.include.keys(
              'id', 'title', 'content', 'author', 'created');
          });
          resBlogPost = res.body[0];
          return BlogPost.findById(resBlogPost.id);
        })
        .then(function(blogpost) {
          resBlogPost.id.should.equal(blogpost.id);
          resBlogPost.title.should.equal(blogpost.title);
          resBlogPost.content.should.equal(blogpost.content);
          resBlogPost.author.should.equal(blogpost.authorName);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog post', function() {

      const newBlogPost = generateBlogData();
      
      return chai.request(app)
        .post('/posts')
        .send(newBlogPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys(
            'id', 'title', 'author', 'content', 'created'
          );
          res.body.title.should.equal(newBlogPost.title);
          res.body.content.should.equal(newBlogPost.content);
          res.body.author.should.equal(newBlogPost.author.firstName + ' ' + newBlogPost.author.lastName);
          return BlogPost.findById(res.body.id);
        })
        .then(function(blogpost) {
          blogpost.title.should.equal(newBlogPost.title);
          blogpost.content.should.equal(newBlogPost.content);
          blogpost.author.firstName.should.equal(newBlogPost.author.firstName);
          blogpost.author.lastName.should.equal(newBlogPost.author.lastName);
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should update fields', function() {
      const updateData = {
        title: 'Cheezeburgerz: A History of Lolcats',
      };

      return BlogPost
        .findOne()
        .then(function(blogpost) {
          updateData.id = blogpost.id;

          return chai.request(app)
            .put(`/posts/${blogpost.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(updateData.id);
        })
        .then(function(blogpost) {
          blogpost.title.should.equal(updateData.title);
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('should delete a blog post by ID', function() {
      let blogpost;

      return BlogPost
        .findOne()
        .then(function(_blogpost) {
          blogpost = _blogpost;
          return chai.request(app).delete(`/posts/${blogpost.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(blogpost.id);
        })
        .then(function(_blogpost) {
          should.not.exist(_blogpost);
        });
    });
  });
});