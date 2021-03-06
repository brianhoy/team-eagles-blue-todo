(function(){
    var User    = require('../models/UserModel');
    var Todo	= require('../models/TodoModel');
    var express = require('express');
    var router  = express.Router();

    // Generic Error Handler used by all endpoints
    function handleError(res, reason, message, code) {
        console.log("ERROR " + reason);
        res.sendStatus(code || 500).json({"error": message});
    }

    module.exports = function(app){
        // "/todos" ROUTES
        // 
        // GET:    find all todos attached to this username
        // POST:   check if Todo exists, if not post new Todo
        // PUT:    edit Todos if user is logged in
        // DELETE: delete todo reference from User.todos, 
        //         and deletes Todo itself from DB.
        router.get('/todo', function(req, res, next){
            console.log("Received get /todo request");

            var userId = req.session.user_id;
            // Check if user is logged in
            if(userId){
                User.findById(userId)
                    .populate('todos')
                    .exec( (err, user) => {
                        if(err){
                            handleError(res, err.message, 'Failed to find User.');
                            return;
                        }
                        res.json(user.todos);
                    });
            } else {
                console.log("user needs to login");
                res.json({message: "You need to log in to do that."});
            }
        });

        router.post('/todo', function(req, res, next){
            var userId   = req.session.user_id;
            var todo     = req.body.newTodo;

            if( userId && todo ){
                todo = new Todo(todo);

                // Push new Todo to user.todos
                User.findById(userId, (err, user) => {
                    if(err){
                        handleError(res, err.message, 'Failed to get User.');
                        return;
                    }

                    user.todos.push(todo);
                    user.save( err => {
                        if(err){
                            handleError(res, err.message, 'Failed to save user to database.');
                            return;
                        }
                        // Save new Todo to DB
                        todo.save( err => {
                            if(err){
                                handleError(res, err.message, 'Failed to save Todo to database.');
                                return;
                            }
                            console.log("Successfully posted todo");
                            res.json({message: "Successfully posted todo."});
                        });
                    });
                });

            }
        });

        router.put('/todo', function(req, res){
            var userId = req.session.user_id;
            var todo   = req.body.todo;

            if( userId && todo ){
                Todo.findOneAndUpdate({"_id": todo._id}, todo, {upsert: true}, (err, todo) => {
                    User.findOne({"username": userId})
                        .populate('todos')
                        .exec( (err, user) => {
                            if(err){
                                handleError(res, err.message, 'Failed to update Todo.');
                                return;
                            }
                            res.json({message: "Successfully updated todo"});
                        });
                });
            }
        });

        router.post('/deletetodo', function(req, res){
            var userId = req.session.user_id;
            var todo   = req.body.todo;

            if( userId && todo ){
                User.findById(userId, (err, user) => {
                    if(err){
                        handleError(res, err.message, 'Failed to find User.');
                        return;
                    }

                    // delete todo from user.todos
                    var index = user.todos.indexOf(todo._id);
                    user.todos.splice(index, 1);

                    // delete Todo from DB
                    Todo.findById(todo._id)
                        .remove()
                        .exec( (err, data) => {
                            if(err){
                                handleError(res, err.message, 'Failed to find Todo.');
                                return;
                            }
                        });
                    // Save User data
                    user.save( err => {
                        if(err){
                            handleError(res, err.message, 'Failed to save User info.');
                            return;
                        }
                        res.json(user);
                    });
                })
            }
        });


        app.use('/', router);
    }
})();