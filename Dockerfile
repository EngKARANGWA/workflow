FROM richarvey/nginx-php-fpm:3.1.6

COPY . .

# Image config - our own scripts/00-laravel-deploy.sh handles composer install,
# so the base image shouldn't also try to run its own default one.
ENV SKIP_COMPOSER=1
ENV WEBROOT=/var/www/html/public
ENV PHP_ERRORS_STDERR=1
ENV RUN_SCRIPTS=1
ENV REAL_IP_HEADER=1

# Laravel config
ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr

# Allow composer to run as root inside the container
ENV COMPOSER_ALLOW_SUPERUSER=1

CMD ["/start.sh"]
