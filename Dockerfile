FROM ruby:2.7-alpine

RUN apk add --no-cache build-base gcc bash cmake git

RUN gem install bundler -v "~>1.0" && gem install bundler jekyll

WORKDIR /site

RUN gem install github-pages 

RUN echo 'source "https://rubygems.org"' >> /site/Gemfile
RUN echo 'gem "github-pages", "~> 213", :group => :jekyll_plugins' >> /site/Gemfile

EXPOSE 4000

CMD [ "bundle", "exec", "jekyll", "serve", "--source", "docs", "-H", "0.0.0.0", "-P", "4000" ]