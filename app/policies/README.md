# Policies

Policies are middleware functions that are configured per url and run on each request.

## Conventions

Similar to creating middleware, it's useful to conform to the convention of wrapping the middleware in a function that accepts options,
allowing users to extend functionality. Even if your middleware accepts no options, this is still a good idea to keep things uniform.

## Resources

* [Koa Guide](https://github.com/koajs/koa/blob/master/docs/guide.md)
