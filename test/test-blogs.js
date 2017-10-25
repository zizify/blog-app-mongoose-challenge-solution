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
          console.log(res.body);
          res.body.should.have.length.of.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          console.log(count);
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
});