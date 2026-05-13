export class Gallery {
  private photos: string[]
  private currentIndex = 0
  private overlay: HTMLDivElement
  private imgEl: HTMLImageElement

  constructor(photos: string[]) {
    this.photos = photos
    const { overlay, imgEl } = this.buildDOM()
    this.overlay = overlay
    this.imgEl = imgEl
    this.bindKeys()
  }

  private buildDOM(): { overlay: HTMLDivElement; imgEl: HTMLImageElement } {
    const overlay = document.createElement('div')
    overlay.id = 'gallery-overlay'
    overlay.classList.add('hidden')
    overlay.innerHTML = `
      <div class="gal-modal">
        <button class="gal-close" aria-label="Close">✕</button>
        <button class="gal-prev" aria-label="Previous">&#8249;</button>
        <div class="gal-img-wrap">
          <img class="gal-img" src="" alt="Our moment" />
        </div>
        <button class="gal-next" aria-label="Next">&#8250;</button>
        <div class="gal-dots"></div>
      </div>
    `

    overlay.querySelector('.gal-close')!.addEventListener('click', () => this.close())
    overlay.querySelector('.gal-prev')!.addEventListener('click', () => this.nav(-1))
    overlay.querySelector('.gal-next')!.addEventListener('click', () => this.nav(1))
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close()
    })

    const dotsContainer = overlay.querySelector('.gal-dots')!
    this.photos.forEach((_, i) => {
      const dot = document.createElement('button')
      dot.className = 'gal-dot'
      dot.setAttribute('aria-label', `Photo ${i + 1}`)
      dot.addEventListener('click', () => this.show(i))
      dotsContainer.appendChild(dot)
    })

    document.body.appendChild(overlay)
    return { overlay, imgEl: overlay.querySelector('.gal-img') as HTMLImageElement }
  }

  private syncDots(): void {
    this.overlay.querySelectorAll('.gal-dot').forEach((d, i) => {
      d.classList.toggle('active', i === this.currentIndex)
    })
  }

  private show(index: number): void {
    this.currentIndex = index
    this.imgEl.style.opacity = '0'
    setTimeout(() => {
      this.imgEl.src = this.photos[this.currentIndex]
      this.imgEl.style.opacity = '1'
    }, 150)
    this.syncDots()
  }

  private nav(dir: number): void {
    this.show((this.currentIndex + dir + this.photos.length) % this.photos.length)
  }

  open(index = 0): void {
    this.show(index)
    this.overlay.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }

  close(): void {
    this.overlay.classList.add('hidden')
    document.body.style.overflow = ''
  }

  private bindKeys(): void {
    document.addEventListener('keydown', (e) => {
      if (this.overlay.classList.contains('hidden')) return
      if (e.key === 'Escape') this.close()
      else if (e.key === 'ArrowLeft') this.nav(-1)
      else if (e.key === 'ArrowRight') this.nav(1)
    })
  }
}
