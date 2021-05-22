FROM ruby:2.7-alpine

RUN apk add --no-cache build-base gcc bash cmake git

RUN gem install bundler -v "~>1.0" && gem install bundler jekyll

WORKDIR /site

RUN gem install github-pages 

RUN echo 'source "https://rubygems.org"' >> /site/Gemfile
RUN echo 'gem "github-pages", "~> 213", :group => :jekyll_plugins' >> /site/Gemfile

ARG PORT

EXPOSE $PORT

ENV PORT 4000
ENV OUTPUT_DIR docs

CMD bundle exec jekyll serve --source $OUTPUT_DIR -H 0.0.0.0 -P $PORT