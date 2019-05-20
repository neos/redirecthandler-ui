# Neos.RedirectHandler.Ui
[![Latest Stable Version](https://poser.pugx.org/neos/redirecthandler-ui/v/stable)](https://packagist.org/packages/neos/redirecthandler-ui)
[![License](https://poser.pugx.org/neos/redirecthandler-ui/license)](https://packagist.org/packages/neos/redirecthandler-ui)

This package provides a backend module to manage [Neos.RedirectHandler](https://github.com/neos/redirecthandler) redirects which are stored in [Neos.RedirectHandler.DatabaseStorage](https://github.com/neos/redirecthandler-databasestorage).

## Compatibility and Maintenance

This package is compatible with Neos 3.x, 4.x and will be maintained for upcoming versions.

## Installation

1. Run the following command in your site package

    composer require neos/redirecthandler-ui
    
2. Then run `composer update` in your projects root folder.
3. Then you can add the `RedirectAdministrator` role to the users who need access to the new backend module.


## Screenshot
![Redirects Module Screenshot](Documentation/redirects-module.png?raw=true "Redirects Module Screenshot")
             
## License

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
